# 04 — Content Schema

## 1. Seed 数量

### CONTENT-001 · P0 · Research

创建 60 张 Research English Context Cards，分两批，每批：

```text
15 General Research
6 Statistics / Methodology
9 Bioinformatics
```

合计 30 + 30。每日分配仍是严格 5 + 2 + 3；词库扩大后应支持连续至少六天新卡，而不是改变每日配额。

### CONTENT-002 · P0 · Medical

创建 60 张 Medical English Context Cards，分两批各 30 张。

合理覆盖：

- Anatomy
- Physiology
- Pathology
- Symptoms
- Signs
- Diseases
- Diagnosis
- Laboratory
- Imaging
- Treatment
- Pharmacology
- Surgery / Procedures
- Clinical expressions

不得几乎全部集中在疾病、药物或解剖名词。

---

## 2. Card 字段

### CONTENT-003 · P0 · JSON 字段

每张卡至少包括：

```text
id
lemma
display_form
part_of_speech
ipa
module
category
meaning_en
meaning_zh
usage_note
context_sentence
target_text
plain_english_paraphrase
sentence_translation_zh
collocations
source_type
source_title
source_url
doi
pmid
```

推荐 JSON 结构：

```json
{
  "id": "res-general-attenuate-001",
  "lemma": "attenuate",
  "display_form": "attenuated",
  "part_of_speech": "verb",
  "ipa": "/əˈtenjueɪt/",
  "module": "research_english",
  "category": "general_research",
  "meaning_en": "to make an effect, association, or signal weaker",
  "meaning_zh": "减弱；降低",
  "usage_note": "只有效应、关联或信号确实变弱时才能用，比 reduce 更强调“被压小”。不要写成已经消失或被消除。",
  "context_sentence": "The association was substantially attenuated after adjustment for age and BMI.",
  "target_text": "attenuated",
  "plain_english_paraphrase": "Adjusting for age and BMI made the observed association weaker.",
  "sentence_translation_zh": "调整年龄和 BMI 后，该关联明显减弱。",
  "collocations": ["attenuate the association", "attenuate an effect", "attenuate inflammation"],
  "source_type": "original_example",
  "source_title": null,
  "source_url": null,
  "doi": null,
  "pmid": null
}
```

Medical 示例：

```json
{
  "id": "med-signs-palpable-001",
  "lemma": "palpable",
  "display_form": "palpable",
  "part_of_speech": "adjective",
  "ipa": "/ˈpælpəbəl/",
  "module": "medical_english",
  "category": "signs",
  "meaning_en": "able to be felt during physical examination",
  "meaning_zh": "可触及的",
  "usage_note": "检查者用手摸到的体征，比 visible 更强调触诊。只看见摸不到就别写 palpable。",
  "context_sentence": "A firm, non-tender mass was palpable in the right upper quadrant.",
  "target_text": "palpable",
  "plain_english_paraphrase": "The examiner could feel a firm mass in the right upper abdomen.",
  "sentence_translation_zh": "右上腹可触及一个质硬、无压痛的肿块。",
  "collocations": ["palpable mass", "palpable lymph nodes", "palpable pulse"],
  "source_type": "original_example",
  "source_title": null,
  "source_url": null,
  "doi": null,
  "pmid": null
}
```

---

## 3. 来源规则

### CONTENT-004 · P0 · 禁止虚构

禁止虚构：

- DOI；
- PMID；
- 作者；
- 期刊；
- 论文标题；
- 指南名称；
- 病例来源；
- URL。

没有核验真实来源的原创例句必须使用：

```text
source_type = "original_example"
source_title = null
source_url = null
doi = null
pmid = null
```

如果以后加入真实来源，必须经过独立核验。

---

## 4. 内容质量

### CONTENT-005 · P0 · Context sentence

Context sentence 必须：

- 符合科研或医学常见表达；
- 能辅助判断目标词含义；
- 不是词典定义机械改写；
- 没有明显统计、医学或生信错误；
- 不过长；
- 不依赖未解释的罕见缩写；
- 不全部使用相同模板；
- `target_text` 必须确实出现在句子中。

### CONTENT-006 · P0 · Plain-English paraphrase

Paraphrase 必须真正降低句子理解难度，而不是只替换一两个词。

### CONTENT-007 · P0 · 中文

- 中文释义符合当前 sense；
- 完整句子翻译自然准确；
- `usage_note` 用一两句中文说明写作时的使用强度：证据或关系要多强才诚实，必要时对比更弱或更强的近邻词；
- 不把中文逐词硬译；
- 医学术语使用常见规范表达。

### CONTENT-008 · P0 · Collocations

每张卡建议 2–4 个自然搭配。

不得为凑数创造生硬短语。

---

## 5. 去重

### CONTENT-009 · P0 · 重复检查

内容校验至少检查：

- 重复 `id`；
- 完全相同 context；
- 大小写差异；
- lemma 与 display form 的重复；
- 英美拼写变体；
- 单复数和词形变化；
- 同一 lemma、同一 sense、近似相同 context；
- 相同 target text 但分类错误。

同一 lemma 可以存在不同专业 sense，但必须在：

```text
meaning_en
meaning_zh
usage_note
context_sentence
```

中清晰区分。

---

## 6. 文件

### CONTENT-010 · P0

提供：

```text
data/seed-data.json
data/import-template.csv
scripts/validate-content.*
```

CSV 至少包含与 JSON 对应的扁平列。

`collocations` 在 CSV 中可使用稳定分隔符，例如：

```text
attenuate the association|attenuate an effect|attenuate inflammation
```

---

## 7. 校验规则

### CONTENT-011 · P0

校验脚本必须失败于：

- 必填字段缺失；
- 分类非法；
- module 非法；
- target_text 不在 context 中；
- source_type 与来源字段矛盾；
- Research 不是 30 + 12 + 18（两批各 15 + 6 + 9）；
- Medical 不是 60（两批各 30，分类覆盖加倍）；
- 总数不是 120；
- 重复 ID；
- 完全重复 context；
- collocations 为空；
- 原创例句带有伪造 DOI / PMID；
- usage_note 不是中文使用强度说明。

输出应给出具体 card id 和错误原因。

---

## 8. 不在本次实现的内容功能

### CONTENT-012 · Deferred

本次不实现：

- AI 自动生成卡片；
- PDF 或全文抽词；
- 用户自定义 Add Word；
- 在线词典；
- Anki 导出；
- 大规模正式词库。

数据结构应可扩展，但 UI 不创建入口。
