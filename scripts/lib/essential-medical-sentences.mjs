function article(word) {
  return /^[aeiou]/iu.test(word) ? "an" : "a";
}

function noun(lemma) {
  return lemma;
}

export const NOUN_FRAMES = [
  {
    id: "chart_problem_list",
    sentence: (lemma) =>
      `The intern added ${noun(lemma)} to the problem list after morning teaching.`,
    paraphrase: (_lemma, meaningEn) =>
      `After the teaching round, the intern listed ${meaningEn} among the problems.`,
    translation: (zh) => `晨间带教后，实习医生把${zh}写进了问题列表。`
  },
  {
    id: "ward_round_pause",
    sentence: (lemma) =>
      `On the ward round the registrar paused so juniors could name the ${noun(lemma)}.`,
    paraphrase: (_lemma, meaningEn) =>
      `During rounds the senior stopped and asked the juniors to name ${meaningEn}.`,
    translation: (zh) => `查房时，高年资住院医师停下来，让低年资医生说出${zh}。`
  },
  {
    id: "lecture_slide",
    sentence: (lemma) =>
      `The lecture slide highlighted the ${noun(lemma)} next to a simpler neighboring term.`,
    paraphrase: (_lemma, meaningEn) =>
      `The classroom slide put ${meaningEn} beside a plainer nearby word.`,
    translation: (zh) => `课堂幻灯把${zh}标在一个更浅的邻近词旁边。`
  },
  {
    id: "short_case",
    sentence: (lemma) =>
      `A one-paragraph case opened by naming the ${noun(lemma)} before later findings.`,
    paraphrase: (_lemma, meaningEn) =>
      `The short case first named ${meaningEn}, then listed what came next.`,
    translation: (zh) => `短病例开头先写出${zh}，再写后面的发现。`
  },
  {
    id: "textbook_figure",
    sentence: (lemma) =>
      `The textbook figure labels the ${noun(lemma)} beside the neighboring tissue.`,
    paraphrase: (_lemma, meaningEn) =>
      `The printed figure marks ${meaningEn} next to the nearby tissue.`,
    translation: (zh) => `教材插图把${zh}标在邻近组织旁边。`
  },
  {
    id: "tutor_pointing",
    sentence: (lemma) => `In class the tutor pointed to the ${noun(lemma)} on the wall chart.`,
    paraphrase: (_lemma, meaningEn) => `The tutor used the wall chart and pointed to ${meaningEn}.`,
    translation: (zh) => `课堂上，老师指着墙上的图讲解${zh}。`
  },
  {
    id: "skills_lab",
    sentence: (lemma) =>
      `In the skills lab students had to identify the ${noun(lemma)} on a model.`,
    paraphrase: (_lemma, meaningEn) =>
      `Lab practice asked students to find ${meaningEn} on the model.`,
    translation: (zh) => `技能实验室里，学生要在模型上认出${zh}。`
  },
  {
    id: "chart_note_line",
    sentence: (lemma) => `The progress note mentioned the ${noun(lemma)} in one plain line.`,
    paraphrase: (_lemma, meaningEn) => `The ward note used one simple line to record ${meaningEn}.`,
    translation: (zh) => `病程记录用一句平实的话写到了${zh}。`
  },
  {
    id: "history_taking",
    sentence: (lemma) =>
      `After history taking, the student wrote the ${noun(lemma)} under current problems.`,
    paraphrase: (_lemma, meaningEn) =>
      `Once the history was finished, the student listed ${meaningEn} with the current problems.`,
    translation: (zh) => `问完病史后，学生把${zh}写在目前问题下面。`
  },
  {
    id: "attending_check",
    sentence: (lemma) =>
      `The attending asked whether this really was the ${noun(lemma)} or a looser bedside word.`,
    paraphrase: (_lemma, meaningEn) =>
      `The consultant checked that the team meant ${meaningEn}, not a vaguer everyday word.`,
    translation: (zh) => `主治医师追问：这里是不是${zh}，还是只是更松的床旁说法。`
  },
  {
    id: "labelled_slide",
    sentence: (lemma) =>
      `A labelled classroom slide showed the ${noun(lemma)} without extra commentary.`,
    paraphrase: (_lemma, meaningEn) =>
      `The teaching slide simply marked ${meaningEn} and left the rest for discussion.`,
    translation: (zh) => `一张带标注的课堂幻灯只标出${zh}，没有再加解释。`
  },
  {
    id: "tutorial_explain",
    sentence: (lemma) =>
      `In the tutorial, each pair had to explain the ${noun(lemma)} in one spoken sentence.`,
    paraphrase: (_lemma, meaningEn) =>
      `Tutorial pairs had to say ${meaningEn} out loud in a single sentence.`,
    translation: (zh) => `小组课上，每两人要用一句话口头解释${zh}。`
  },
  {
    id: "imaging_conference",
    sentence: (lemma) =>
      `At the teaching conference the film was used to locate the ${noun(lemma)}.`,
    paraphrase: (_lemma, meaningEn) =>
      `The teaching meeting used the image so students could find ${meaningEn}.`,
    translation: (zh) => `教学读片会上，用这张片子让学生找出${zh}。`
  },
  {
    id: "night_handover",
    sentence: (lemma) => `Night handover listed the ${noun(lemma)} before the overnight plan.`,
    paraphrase: (_lemma, meaningEn) =>
      `The night team named ${meaningEn} first, then said what to do overnight.`,
    translation: (zh) => `夜班交接时先提到${zh}，再讲夜间计划。`
  },
  {
    id: "glossary_margin",
    sentence: (lemma) =>
      `The chapter margin lists the ${noun(lemma)} with other core classroom words.`,
    paraphrase: (_lemma, meaningEn) =>
      `The side note groups ${meaningEn} with the other must-know terms.`,
    translation: (zh) => `章节页边把${zh}和其他课堂核心词列在一起。`
  },
  {
    id: "bedside_teaching",
    sentence: (lemma) =>
      `Bedside teaching returned to the ${noun(lemma)} whenever the finding came up.`,
    paraphrase: (_lemma, meaningEn) =>
      `At the bedside the teacher kept coming back to ${meaningEn} when that finding appeared.`,
    translation: (zh) => `床旁带教时，一碰到这个发现就会回到${zh}。`
  },
  {
    id: "case_stem",
    sentence: (lemma) => `The case stem named the ${noun(lemma)} before asking what to do next.`,
    paraphrase: (_lemma, meaningEn) =>
      `The exam-style stem first named ${meaningEn}, then asked for the next step.`,
    translation: (zh) => `病例题干先写出${zh}，再问下一步怎么做。`
  },
  {
    id: "whiteboard",
    sentence: (lemma) =>
      `The tutor wrote the ${noun(lemma)} on the board and circled the classroom sense.`,
    paraphrase: (_lemma, meaningEn) =>
      `On the board the tutor wrote ${meaningEn} and marked the classroom meaning.`,
    translation: (zh) => `老师把${zh}写在黑板上，并圈出课堂义。`
  },
  {
    id: "admission_note",
    sentence: (lemma) =>
      `The admission note placed the ${noun(lemma)} among the early working problems.`,
    paraphrase: (_lemma, meaningEn) =>
      `The first ward note included ${meaningEn} in the early problem list.`,
    translation: (zh) => `入院记录把${zh}写进了初步问题。`
  },
  {
    id: "quiz_prompt",
    sentence: (lemma) =>
      `The classroom quiz asked students to recognise the ${noun(lemma)} from a short stem.`,
    paraphrase: (_lemma, meaningEn) =>
      `The quiz used a short stem and asked students to recognise ${meaningEn}.`,
    translation: (zh) => `随堂测验用一小段题干，让学生认出${zh}。`
  },
  {
    id: "anatomy_lab",
    sentence: (lemma) =>
      `In the anatomy lab a pin marked the ${noun(lemma)} on the demonstration specimen.`,
    paraphrase: (_lemma, meaningEn) =>
      `A lab pin showed where ${meaningEn} sat on the demonstration specimen.`,
    translation: (zh) => `解剖实验室里，标本上的钉子标出了${zh}。`
  },
  {
    id: "handover_sheet",
    sentence: (lemma) => `The printed handover sheet kept the ${noun(lemma)} on the first line.`,
    paraphrase: (_lemma, meaningEn) =>
      `The paper handover put ${meaningEn} at the top of the list.`,
    translation: (zh) => `打印的交接单把${zh}放在第一行。`
  },
  {
    id: "revision_card",
    sentence: (lemma) =>
      `Her revision card grouped the ${noun(lemma)} with two nearby classroom terms.`,
    paraphrase: (_lemma, meaningEn) =>
      `The revision card put ${meaningEn} together with two neighboring class words.`,
    translation: (zh) => `她的复习卡把${zh}和两个邻近的课堂词放在一组。`
  },
  {
    id: "consultant_summary",
    sentence: (lemma) =>
      `The consultant summary named the ${noun(lemma)} and then restated it in plain words.`,
    paraphrase: (_lemma, meaningEn) =>
      `The senior first said ${meaningEn}, then repeated the idea in everyday language.`,
    translation: (zh) => `顾问医师先点出${zh}，再用白话复述一遍。`
  }
];

export const ADJ_FRAMES = [
  {
    id: "chart_quality",
    sentence: (lemma) => `The note used ${lemma} to mark the quality of the finding.`,
    paraphrase: (_lemma, meaningEn) =>
      `The chart chose this adjective to say the finding was ${meaningEn}.`,
    translation: (zh) => `病历用这个词标明该发现是${zh}。`
  },
  {
    id: "tutor_choice",
    sentence: (lemma) => `The tutor asked for ${lemma} rather than a looser bedside word.`,
    paraphrase: (_lemma, meaningEn) =>
      `The teacher wanted this exact word, meaning ${meaningEn}, not a vaguer bedside term.`,
    translation: (zh) => `老师要求用这个词（${zh}），不要换成更松的床旁说法。`
  },
  {
    id: "ward_document",
    sentence: (lemma) => `After examination the sign was documented as ${lemma}.`,
    paraphrase: (_lemma, meaningEn) =>
      `Once the exam was done, the team wrote that the finding was ${meaningEn}.`,
    translation: (zh) => `查体结束后，记录把该体征写成${zh}。`
  },
  {
    id: "case_stem_adj",
    sentence: (lemma) =>
      `The case stem described ${article(lemma)} ${lemma} change that students had to interpret.`,
    paraphrase: (_lemma, meaningEn) =>
      `The stem described a change that was ${meaningEn} and asked students to read it.`,
    translation: (zh) => `题干写到一个${zh}的改变，要学生自己判断。`
  },
  {
    id: "textbook_warning",
    sentence: (lemma) =>
      `The textbook warns not to write ${lemma} unless the evidence actually fits.`,
    paraphrase: (_lemma, meaningEn) =>
      `The book says use this word only when the finding truly is ${meaningEn}.`,
    translation: (zh) => `教材提醒：证据对得上时才能写${zh}。`
  },
  {
    id: "presentation_course",
    sentence: (lemma) => `Her presentation stayed ${lemma} from admission through the first night.`,
    paraphrase: (_lemma, meaningEn) =>
      `From admission to the first night, the picture remained ${meaningEn}.`,
    translation: (zh) => `从入院到第一夜，她的表现一直是${zh}。`
  },
  {
    id: "attending_truly",
    sentence: (lemma) =>
      `The attending asked whether the process was truly ${lemma} in this patient.`,
    paraphrase: (_lemma, meaningEn) =>
      `The consultant checked that the process really was ${meaningEn} here.`,
    translation: (zh) => `主治医师问：这个过程在该患者身上是否真的是${zh}。`
  },
  {
    id: "compare_opposite",
    sentence: (lemma) =>
      `Students compared ${article(lemma)} ${lemma} pattern with the opposite classroom example.`,
    paraphrase: (_lemma, meaningEn) =>
      `The class set a ${meaningEn} pattern against the opposite teaching example.`,
    translation: (zh) => `学生把${zh}的模式和课堂上相反的例子对照。`
  },
  {
    id: "handover_adj",
    sentence: (lemma) =>
      `Handover kept the wording ${lemma} so the night team would not soften it.`,
    paraphrase: (_lemma, meaningEn) =>
      `The outgoing team kept the precise word that means ${meaningEn}.`,
    translation: (zh) => `交接时坚持用${zh}这个写法，避免夜班说得太软。`
  },
  {
    id: "quiz_adj",
    sentence: (lemma) => `The quiz asked which finding should be called ${lemma}.`,
    paraphrase: (_lemma, meaningEn) => `The quiz wanted the finding that is honestly ${meaningEn}.`,
    translation: (zh) => `测验问：哪个发现才该写成${zh}。`
  },
  {
    id: "board_adj",
    sentence: (lemma) =>
      `On the board the tutor underlined ${lemma} as the tighter classroom choice.`,
    paraphrase: (_lemma, meaningEn) =>
      `The teacher marked this word, meaning ${meaningEn}, as the stricter classroom choice.`,
    translation: (zh) => `老师在黑板上划出${zh}，作为更严的课堂用词。`
  },
  {
    id: "lab_report_adj",
    sentence: (lemma) =>
      `The teaching lab slip called the result ${lemma} and left the numbers beside it.`,
    paraphrase: (_lemma, meaningEn) =>
      `The practice report labeled the result as ${meaningEn} and kept the numbers next to it.`,
    translation: (zh) => `教学化验单把结果写成${zh}，数字写在旁边。`
  },
  {
    id: "round_adj",
    sentence: (lemma) => `During rounds the intern defended calling the course ${lemma}.`,
    paraphrase: (_lemma, meaningEn) =>
      `On rounds the intern explained why the course counted as ${meaningEn}.`,
    translation: (zh) => `查房时，实习医生说明为什么病程可以写成${zh}。`
  },
  {
    id: "margin_adj",
    sentence: (lemma) =>
      `A textbook margin note contrasts ${lemma} with a weaker everyday adjective.`,
    paraphrase: (_lemma, meaningEn) =>
      `The margin sets this word, meaning ${meaningEn}, against a weaker everyday adjective.`,
    translation: (zh) => `教材页边把${zh}和一个更弱的日常形容词对照。`
  },
  {
    id: "voice_adj",
    sentence: (lemma) =>
      `The registrar said the wording should stay ${lemma} in the discharge line.`,
    paraphrase: (_lemma, meaningEn) =>
      `The senior wanted the discharge line to keep the sense ${meaningEn}.`,
    translation: (zh) => `住院总医师说出院小结仍应写成${zh}。`
  },
  {
    id: "pair_work_adj",
    sentence: (lemma) => `Pair work asked when a finding is ${lemma} and when it is not.`,
    paraphrase: (_lemma, meaningEn) =>
      `Students had to say when a finding is ${meaningEn} and when that word is too strong.`,
    translation: (zh) => `结对练习要分清：什么时候算${zh}，什么时候还不算。`
  }
];

export const VERB_FRAMES = [
  {
    id: "intern_task",
    sentence: (lemma) => `The intern had to ${lemma} the problem using only the history and exam.`,
    paraphrase: (_lemma, meaningEn) =>
      `With history and exam alone, the intern had to ${meaningEn}.`,
    translation: (zh) => `实习医生只能靠病史和查体来${zh}。`
  },
  {
    id: "skills_verb",
    sentence: (lemma) =>
      `In the skills lab, students practiced how to ${lemma} this finding safely.`,
    paraphrase: (_lemma, meaningEn) =>
      `Lab practice was about how to ${meaningEn} without rushing.`,
    translation: (zh) => `技能课上，学生练习如何稳妥地${zh}这一发现。`
  },
  {
    id: "protocol_verb",
    sentence: (lemma) =>
      `The protocol tells the nurse when to ${lemma} and when to wait for review.`,
    paraphrase: (_lemma, meaningEn) =>
      `The written steps say when staff should ${meaningEn} and when to wait.`,
    translation: (zh) => `规程写明护士何时该${zh}，何时等复查。`
  },
  {
    id: "night_verb",
    sentence: (lemma) => `The case discussion asked who should ${lemma} first on the night shift.`,
    paraphrase: (_lemma, meaningEn) =>
      `The discussion asked which night-shift person should ${meaningEn} first.`,
    translation: (zh) => `病例讨论问：夜班谁该先${zh}。`
  },
  {
    id: "textbook_verb",
    sentence: (lemma) =>
      `The textbook example shows clinicians ${lemma} only after enough evidence.`,
    paraphrase: (_lemma, meaningEn) =>
      `The book shows staff ${meaningEn} only when the evidence is enough.`,
    translation: (zh) => `教材例子写：证据够了才${zh}。`
  },
  {
    id: "caution_verb",
    sentence: (lemma) => `Juniors were told not to ${lemma} from a single abnormal number alone.`,
    paraphrase: (_lemma, meaningEn) =>
      `Seniors warned them not to ${meaningEn} from one odd number.`,
    translation: (zh) => `高年资医生提醒：不要只凭一个异常数字就${zh}。`
  },
  {
    id: "handover_verb",
    sentence: (lemma) => `Handover asked the night intern to ${lemma} if the finding returned.`,
    paraphrase: (_lemma, meaningEn) =>
      `The outgoing team asked the night intern to ${meaningEn} if it came back.`,
    translation: (zh) => `交接时交代：如果该发现再出现，夜班实习医生要${zh}。`
  },
  {
    id: "tutor_verb",
    sentence: (lemma) => `The tutor modelled how to ${lemma} in one calm spoken sentence.`,
    paraphrase: (_lemma, meaningEn) =>
      `The teacher showed how to ${meaningEn} in one quiet spoken line.`,
    translation: (zh) => `老师示范：怎样用一句冷静的话来${zh}。`
  },
  {
    id: "quiz_verb",
    sentence: (lemma) => `The quiz stem asked what the intern should ${lemma} next.`,
    paraphrase: (_lemma, meaningEn) => `The quiz asked for the next action: to ${meaningEn}.`,
    translation: (zh) => `测验题干问实习医生下一步该${zh}什么。`
  },
  {
    id: "round_verb",
    sentence: (lemma) =>
      `On rounds the attending let a junior ${lemma} before offering a correction.`,
    paraphrase: (_lemma, meaningEn) =>
      `On rounds a junior was asked to ${meaningEn} first, then the senior adjusted it.`,
    translation: (zh) => `查房时，主治先让低年资医生${zh}，再作纠正。`
  },
  {
    id: "checklist_verb",
    sentence: (lemma) => `The ward checklist says to ${lemma} only after two concordant findings.`,
    paraphrase: (_lemma, meaningEn) =>
      `The checklist allows staff to ${meaningEn} only after two matching findings.`,
    translation: (zh) => `病房清单写：两个发现对得上才能${zh}。`
  },
  {
    id: "pair_verb",
    sentence: (lemma) => `Pair work practised how to ${lemma} without copying the textbook line.`,
    paraphrase: (_lemma, meaningEn) => `Students practised how to ${meaningEn} in their own words.`,
    translation: (zh) => `结对练习：用自己的话${zh}，不要照抄教材原句。`
  }
];

export const PHRASE_FRAMES = [
  {
    id: "lecture_phrase",
    sentence: (lemma) => `The lecture placed the ${lemma} next to related classroom structures.`,
    paraphrase: (_lemma, meaningEn) =>
      `The lecture sat ${meaningEn} beside related classroom structures.`,
    translation: (zh) => `讲课把${zh}放在相关课堂结构旁边。`
  },
  {
    id: "case_phrase",
    sentence: (lemma) => `The case note named the ${lemma} before describing what happened next.`,
    paraphrase: (_lemma, meaningEn) =>
      `The note first named ${meaningEn}, then said what followed.`,
    translation: (zh) => `病历先写出${zh}，再写接下来发生了什么。`
  },
  {
    id: "plain_sentence",
    sentence: (lemma) => `Students had to explain the ${lemma} in one plain sentence of their own.`,
    paraphrase: (_lemma, meaningEn) =>
      `Each student had to say ${meaningEn} in one ordinary sentence.`,
    translation: (zh) => `学生要用自己的一句白话解释${zh}。`
  },
  {
    id: "figure_phrase",
    sentence: (lemma) => `The first chapter figure was a simple diagram of the ${lemma}.`,
    paraphrase: (_lemma, meaningEn) => `The opening figure was a plain diagram of ${meaningEn}.`,
    translation: (zh) => `该章第一张图就是${zh}的简单示意图。`
  },
  {
    id: "rounds_function",
    sentence: (lemma) => `On rounds the registrar asked for the everyday function of the ${lemma}.`,
    paraphrase: (_lemma, meaningEn) =>
      `On rounds the senior asked what ${meaningEn} does in ordinary words.`,
    translation: (zh) => `查房时，住院医师问${zh}日常起什么作用。`
  },
  {
    id: "core_vocab",
    sentence: (lemma) => `The textbook treats the ${lemma} as core vocabulary, not extra trivia.`,
    paraphrase: (_lemma, meaningEn) =>
      `The book treats ${meaningEn} as a must-know classroom term, not spare trivia.`,
    translation: (zh) => `教材把${zh}当作核心课堂词，而不是附加冷知识。`
  },
  {
    id: "wall_chart",
    sentence: (lemma) => `The wall chart boxed the ${lemma} so students could find it quickly.`,
    paraphrase: (_lemma, meaningEn) =>
      `The wall chart put a box around ${meaningEn} to make it easy to spot.`,
    translation: (zh) => `墙上的图给${zh}加了框，方便学生快速找到。`
  },
  {
    id: "handover_phrase",
    sentence: (lemma) => `The handover sheet kept the ${lemma} on its own line.`,
    paraphrase: (_lemma, meaningEn) => `The handover kept ${meaningEn} on a separate line.`,
    translation: (zh) => `交接单给${zh}单独留了一行。`
  },
  {
    id: "lab_phrase",
    sentence: (lemma) => `In the lab a pin and a tag marked the ${lemma} on the model.`,
    paraphrase: (_lemma, meaningEn) => `A lab pin and tag showed ${meaningEn} on the model.`,
    translation: (zh) => `实验室里，模型和标签标出了${zh}。`
  },
  {
    id: "tutorial_phrase",
    sentence: (lemma) => `The tutorial pair had to point to the ${lemma} and say it aloud.`,
    paraphrase: (_lemma, meaningEn) =>
      `Each pair pointed to ${meaningEn} and said the words out loud.`,
    translation: (zh) => `小组课上，两人要指出${zh}并大声读出来。`
  },
  {
    id: "note_phrase",
    sentence: (lemma) =>
      `A short teaching note introduced the ${lemma} before any later complications.`,
    paraphrase: (_lemma, meaningEn) =>
      `The teaching note named ${meaningEn} first, before later complications.`,
    translation: (zh) => `短教学笔记先介绍${zh}，再谈后续并发症。`
  },
  {
    id: "quiz_phrase",
    sentence: (lemma) =>
      `The matching quiz asked students to pair the ${lemma} with its classroom gloss.`,
    paraphrase: (_lemma, meaningEn) =>
      `The matching quiz linked ${meaningEn} to its classroom gloss.`,
    translation: (zh) => `配对测验要求把${zh}和课堂释义对上。`
  },
  {
    id: "conference_phrase",
    sentence: (lemma) => `The teaching conference used one slide only for the ${lemma}.`,
    paraphrase: (_lemma, meaningEn) => `The conference reserved a whole slide for ${meaningEn}.`,
    translation: (zh) => `教学讨论会单独用一张幻灯讲${zh}。`
  },
  {
    id: "revision_phrase",
    sentence: (lemma) => `Her revision list put the ${lemma} with two neighboring system terms.`,
    paraphrase: (_lemma, meaningEn) =>
      `The revision list grouped ${meaningEn} with two nearby system terms.`,
    translation: (zh) => `她的复习表把${zh}和两个邻近系统词放在一起。`
  },
  {
    id: "bedside_phrase",
    sentence: (lemma) =>
      `At the bedside the tutor asked a junior to show the ${lemma} on the patient diagram.`,
    paraphrase: (_lemma, meaningEn) =>
      `By the bed the tutor asked a junior to show ${meaningEn} on the patient diagram.`,
    translation: (zh) => `床旁，老师让低年资医生在患者示意图上指出${zh}。`
  },
  {
    id: "margin_phrase",
    sentence: (lemma) =>
      `A margin gloss repeats the ${lemma} in smaller type beside the main paragraph.`,
    paraphrase: (_lemma, meaningEn) =>
      `The margin repeats ${meaningEn} in smaller type next to the main paragraph.`,
    translation: (zh) => `页边用小字在正文旁重复写出${zh}。`
  }
];

export const FALLBACK_FRAMES = [
  {
    id: "fallback_notes",
    sentence: (lemma) => `Classroom notes treat ${lemma} as core vocabulary in this chapter.`,
    paraphrase: (_lemma, meaningEn) =>
      `This chapter’s notes treat ${meaningEn} as a core classroom term.`,
    translation: (zh) => `本章课堂笔记把${zh}当作核心词。`
  },
  {
    id: "fallback_lesson",
    sentence: (lemma) => `This lesson uses ${lemma} in its ordinary textbook sense.`,
    paraphrase: (_lemma, meaningEn) =>
      `This lesson uses the ordinary textbook sense: ${meaningEn}.`,
    translation: (zh) => `这一课按教材普通义使用${zh}。`
  },
  {
    id: "fallback_juniors",
    sentence: (lemma) => `Juniors must recognise ${lemma} before they write the case.`,
    paraphrase: (_lemma, meaningEn) =>
      `Juniors need to recognise ${meaningEn} before writing the case.`,
    translation: (zh) => `低年资医生写病历前先要认出${zh}。`
  },
  {
    id: "fallback_glossary",
    sentence: (lemma) => `The glossary entry for ${lemma} sits with neighboring classroom terms.`,
    paraphrase: (_lemma, meaningEn) =>
      `The glossary puts ${meaningEn} with nearby classroom terms.`,
    translation: (zh) => `词汇表把${zh}和邻近的课堂词放在一起。`
  },
  {
    id: "fallback_ward",
    sentence: (lemma) => `Ward teaching returns to ${lemma} whenever the finding is discussed.`,
    paraphrase: (_lemma, meaningEn) =>
      `Ward teaching comes back to ${meaningEn} whenever that finding is discussed.`,
    translation: (zh) => `病房带教一讨论到该发现，就会回到${zh}。`
  },
  {
    id: "fallback_slide",
    sentence: (lemma) => `A labelled slide showed ${lemma} without extra commentary.`,
    paraphrase: (_lemma, meaningEn) =>
      `The labelled slide showed ${meaningEn} and added no extra comment.`,
    translation: (zh) => `一张带标注的幻灯只出示${zh}，没有再加评论。`
  },
  {
    id: "fallback_spoken",
    sentence: (lemma) => `The tutor asked for a spoken definition of ${lemma} in everyday words.`,
    paraphrase: (_lemma, meaningEn) =>
      `The tutor asked students to say ${meaningEn} in everyday words.`,
    translation: (zh) => `老师要求用日常口语说出${zh}的意思。`
  },
  {
    id: "fallback_card",
    sentence: (lemma) => `Her pocket card kept ${lemma} on the same line as its classroom gloss.`,
    paraphrase: (_lemma, meaningEn) =>
      `The pocket card put ${meaningEn} on the same line as the classroom gloss.`,
    translation: (zh) => `她的口袋卡片把${zh}和课堂释义写在同一行。`
  }
];

export function framesFor(entry) {
  const { lemma, pos } = entry;
  if (pos === "adjective" || pos === "adverb") return ADJ_FRAMES;
  if (pos === "verb" || pos === "phrasal verb") return VERB_FRAMES;
  if (pos === "phrase" || lemma.includes(" ") || lemma.includes("\\") || lemma.includes("/")) {
    return PHRASE_FRAMES;
  }
  return NOUN_FRAMES;
}

export function patternKey(sentence, lemma) {
  return sentence.split(lemma).join("LEMMA");
}
