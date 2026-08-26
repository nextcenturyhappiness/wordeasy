import axe from "axe-core";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { AuthGateway } from "../../src/application/contracts";
import { LoginPage } from "../../src/routes/login/LoginPage";
import {
  anonymousSession,
  authenticatedSession,
  createAuthGateway,
  expiredSession
} from "../auth/fixtures";
import { renderWithAuthenticatedApp } from "./fixtures";

function LoginRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<h1>Account home</h1>} />
    </Routes>
  );
}

describe("LoginPage", () => {
  it("runs the Email to six-digit OTP flow with mobile input attributes", async () => {
    const user = userEvent.setup();
    const authGateway = createAuthGateway({}, anonymousSession);
    renderWithAuthenticatedApp(<LoginRoutes />, {
      authGateway,
      initialSession: anonymousSession,
      accountUserId: "account-a",
      initialEntries: ["/login"]
    });

    const email = screen.getByRole("textbox", { name: "Email" });
    await user.type(email, "Learner@Example.com ");
    await user.click(screen.getByRole("button", { name: "Send six-digit code" }));

    expect(authGateway.requestOtp).toHaveBeenCalledWith("learner@example.com");
    const otp = await screen.findByRole("textbox", { name: "Six-digit code" });
    expect(otp).toHaveAttribute("autocomplete", "one-time-code");
    expect(otp).toHaveAttribute("inputmode", "numeric");
    expect(otp).toHaveAttribute("pattern", "[0-9]{6}");
    expect(otp).toHaveAttribute("maxlength", "6");
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reset password/i)).not.toBeInTheDocument();

    await user.type(otp, "12a34 56");
    expect(otp).toHaveValue("123456");
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));

    expect(authGateway.verifyOtp).toHaveBeenCalledWith("learner@example.com", "123456");
    expect(await screen.findByRole("heading", { name: "Account home" })).toBeInTheDocument();
  });

  it("locks request and resend actions while each request is pending", async () => {
    const user = userEvent.setup();
    let resolveRequest: (() => void) | undefined;
    let resolveResend: (() => void) | undefined;
    const requestOtp = vi.fn<AuthGateway["requestOtp"]>(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve;
        })
    );
    const resendOtp = vi.fn<AuthGateway["resendOtp"]>(
      () =>
        new Promise<void>((resolve) => {
          resolveResend = resolve;
        })
    );
    const authGateway = createAuthGateway({ requestOtp, resendOtp }, anonymousSession);
    renderWithAuthenticatedApp(<LoginRoutes />, {
      authGateway,
      initialSession: anonymousSession,
      accountUserId: "account-a",
      initialEntries: ["/login"]
    });

    await user.type(screen.getByRole("textbox", { name: "Email" }), "a@example.com");
    const send = screen.getByRole("button", { name: "Send six-digit code" });
    await user.dblClick(send);
    expect(requestOtp).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sending code…" })).toBeDisabled();

    resolveRequest?.();
    const resend = await screen.findByRole("button", { name: "Resend code" });
    await user.dblClick(resend);
    expect(resendOtp).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Resending…" })).toBeDisabled();
    resolveResend?.();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
    });
  });

  it("shows expired and verification error states without clearing local data", async () => {
    const user = userEvent.setup();
    const authGateway = createAuthGateway(
      {
        verifyOtp: vi.fn<AuthGateway["verifyOtp"]>(() =>
          Promise.reject(new Error("The code is invalid or has expired."))
        )
      },
      expiredSession
    );
    renderWithAuthenticatedApp(<LoginRoutes />, {
      authGateway,
      initialSession: expiredSession,
      accountUserId: "account-a",
      initialEntries: ["/login"]
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Your session expired");
    expect(screen.getByRole("alert")).toHaveTextContent("unsynced changes were not deleted");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "learner@example.com");
    await user.click(screen.getByRole("button", { name: "Send six-digit code" }));
    await user.type(await screen.findByRole("textbox", { name: "Six-digit code" }), "123456");
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));

    expect(
      (await screen.findByText("The code is invalid or has expired.")).closest('[role="alert"]')
    ).not.toBeNull();
    expect(screen.getByRole("textbox", { name: "Six-digit code" })).toHaveValue("123456");
  });

  it("has no automatically detectable accessibility violations", async () => {
    const authGateway = createAuthGateway({}, anonymousSession);
    const { container } = renderWithAuthenticatedApp(<LoginRoutes />, {
      authGateway,
      initialSession: anonymousSession,
      accountUserId: "account-a",
      initialEntries: ["/login"]
    });

    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });
    expect(result.violations).toEqual([]);
  });

  it("offers sign out for an already authenticated session", async () => {
    const user = userEvent.setup();
    const authGateway = createAuthGateway({}, authenticatedSession);
    renderWithAuthenticatedApp(<LoginRoutes />, {
      authGateway,
      initialSession: authenticatedSession,
      accountUserId: "account-a",
      initialEntries: ["/login"]
    });

    expect(screen.getByText("learner@example.com")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(authGateway.signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { name: "Sign in with email" })).toBeInTheDocument();
  });
});
