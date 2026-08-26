import { Link } from "react-router-dom";

interface RouteNoticeProps {
  eyebrow: string;
  title: string;
  message: string;
}

export function RouteNotice({ eyebrow, title, message }: RouteNoticeProps) {
  return (
    <section className="panel panel--centered route-notice">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{message}</p>
      <Link className="button button--secondary" to="/">
        Return home
      </Link>
    </section>
  );
}
