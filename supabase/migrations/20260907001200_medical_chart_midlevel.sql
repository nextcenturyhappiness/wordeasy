-- Generated from data/seed-data.json Medical mid-level chart expansion by scripts/generate-seed-sql.mjs.

-- Additive: deactivate shallow chart lemmas and insert mid-level owner-PDF chart cards.

-- Do not rewrite 20260826000500_seed_content.sql, 20260903000700_seed_content_batch2.sql,

-- 20260907000800_medical_morphology.sql, or 20260907001000_medical_pdf_expansion.sql.

begin;

insert into public.words (id, stable_key, lemma, display_form, ipa, part_of_speech)
values
  ('ae1b4adf-de10-5096-91ce-4d8c9bebe467', 'en:esophagus:noun', 'esophagus', 'esophagus', '/ɪˈsɑːfəɡəs/', 'noun'),
  ('993a4659-2c29-5d30-a3a9-f32c6181e6b7', 'en:trachea:noun', 'trachea', 'trachea', '/ˈtreɪkiə/', 'noun'),
  ('8d6a7fcd-1d2d-54ea-8fdc-4b7a7099952e', 'en:capillary:noun', 'capillary', 'capillaries', '/ˈkæpəleri/', 'noun'),
  ('0f7f4326-e68a-5c0e-a20e-c1fad276d793', 'en:spleen:noun', 'spleen', 'spleen', '/spliːn/', 'noun'),
  ('a5d75032-94ef-550b-9f4b-16b7a2d6d072', 'en:gallbladder:noun', 'gallbladder', 'gallbladder', '/ˈɡɔːlblædər/', 'noun'),
  ('dc2859bc-a7e2-5edc-b8fc-5248d0e49904', 'en:pancreas:noun', 'pancreas', 'pancreas', '/ˈpæŋkriəs/', 'noun'),
  ('94df5be1-0847-5e67-a4d4-74e7b37ab0c2', 'en:cartilage:noun', 'cartilage', 'cartilage', '/ˈkɑːrtɪlɪdʒ/', 'noun'),
  ('6691d0a3-66de-5404-8a8d-41ea1d94c417', 'en:ureter:noun', 'ureter', 'ureter', '/ˈjʊrətər/', 'noun'),
  ('825798ca-4603-5dfd-994f-8e223db8df7d', 'en:thyroid:noun', 'thyroid', 'thyroid', '/ˈθaɪrɔɪd/', 'noun'),
  ('6a4f6f54-3caf-5131-966f-0b64e31ee126', 'en:lymph-node:noun', 'lymph node', 'lymph nodes', '/lɪmf noʊdz/', 'noun'),
  ('9ec936f0-dbe8-5a7a-8541-eb615f2820f2', 'en:hormone:noun', 'hormone', 'hormones', '/ˈhɔːrmoʊnz/', 'noun'),
  ('ccb02a03-0a55-5f2b-98ab-d98465f54ce8', 'en:absorption:noun', 'absorption', 'absorption', '/əbˈzɔːrpʃn/', 'noun'),
  ('37052224-d3cc-5c23-91e2-8fd4e5bed46a', 'en:elimination:noun', 'elimination', 'elimination', '/ɪˌlɪmɪˈneɪʃn/', 'noun'),
  ('7f5b93f2-12bf-5372-aeda-27a947b8d654', 'en:enzyme:noun', 'enzyme', 'enzymes', '/ˈenzaɪmz/', 'noun'),
  ('4ee869a8-7a0a-5e92-a38c-b221c86ff2c6', 'en:bile:noun', 'bile', 'bile', '/baɪl/', 'noun'),
  ('1289265e-a245-5b4f-9090-0a80f7dea958', 'en:hereditary:adjective', 'hereditary', 'hereditary', '/həˈredɪteri/', 'adjective'),
  ('2e0819d7-9d01-5418-8b95-90c522baaad3', 'en:abscess:noun', 'abscess', 'abscess', '/ˈæbses/', 'noun'),
  ('8d1a8400-7ef8-59f9-b129-1af05ef7cf1f', 'en:obesity:noun', 'obesity', 'obesity', '/oʊˈbiːsəti/', 'noun'),
  ('1f21cbb5-8331-5ac4-ace0-4d49e0546454', 'en:prolapse:noun', 'prolapse', 'prolapse', '/ˈproʊlæps/', 'noun'),
  ('aac55aaf-2da6-52d9-ba58-c51dfed28a84', 'en:insulin:noun', 'insulin', 'insulin', '/ˈɪnsəlɪn/', 'noun'),
  ('36410cab-844c-59d1-a43f-8844d808ae16', 'en:adrenaline:noun', 'adrenaline', 'adrenaline', '/əˈdrenəlɪn/', 'noun'),
  ('53d25635-fb6e-5dbd-9900-94dccd5596b0', 'en:glucagon:noun', 'glucagon', 'glucagon', '/ˈɡluːkəɡɑːn/', 'noun'),
  ('f5f9c663-d804-5c8f-9d98-13140282041b', 'en:sodium:noun', 'sodium', 'sodium', '/ˈsoʊdiəm/', 'noun'),
  ('7aa57dd4-258f-53bb-a485-e0938f1a6eae', 'en:potassium:noun', 'potassium', 'potassium', '/pəˈtæsiəm/', 'noun')
on conflict (id) do update set
  stable_key = excluded.stable_key,
  lemma = excluded.lemma,
  display_form = excluded.display_form,
  ipa = excluded.ipa,
  part_of_speech = excluded.part_of_speech;

insert into public.word_senses (id, stable_key, word_id, module_id, category_id, meaning_en, meaning_zh, usage_note)
values
  ('de884c93-bb58-52ef-8ede-d7699a101356', 'medical_english:anatomy:esophagus:noun', 'ae1b4adf-de10-5096-91ce-4d8c9bebe467', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'f2f95a33-ad8a-576c-9ec4-563e8ad57801', 'the muscular tube that carries food from the pharynx to the stomach', '食管', '咽到胃的食物通道才写 esophagus。气管是 trachea。胸骨后烧灼感可提食管，但不要把所有胸痛都写成食管问题。'),
  ('761d6543-ad52-587a-bc95-e2b7c49b766f', 'medical_english:anatomy:trachea:noun', '993a4659-2c29-5d30-a3a9-f32c6181e6b7', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'f2f95a33-ad8a-576c-9ec4-563e8ad57801', 'the windpipe that carries air from the larynx toward the bronchi', '气管', '喉以下、支气管以上的通气管道才写 trachea。口语 windpipe 是同一结构。不要和食管或整段 airway 混用。'),
  ('0f08010a-3c5f-5b73-9b16-0bc3437352eb', 'medical_english:anatomy:capillary:noun', '8d6a7fcd-1d2d-54ea-8fdc-4b7a7099952e', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'f2f95a33-ad8a-576c-9ec4-563e8ad57801', 'the smallest blood vessels, where gases and nutrients exchange with tissue', '毛细血管', '物质交换发生在毛细血管，不是动脉或静脉干。甲床充盈慢提示末梢灌注，不要把大血管堵塞直接写成 capillary 病变。'),
  ('44485df2-7f87-5d1f-86ed-cdb5d265ee5b', 'medical_english:anatomy:spleen:noun', '0f7f4326-e68a-5c0e-a20e-c1fad276d793', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'f2f95a33-ad8a-576c-9ec4-563e8ad57801', 'the lymphoid organ in the left upper abdomen that filters blood', '脾；脾脏', '左上腹的淋巴器官。肿大写 splenomegaly。不要把所有左上腹痛都写成脾；胃和肾也在附近。'),
  ('1d480893-7b4a-5ea0-bd40-f173ebc387f0', 'medical_english:anatomy:gallbladder:noun', 'a5d75032-94ef-550b-9f4b-16b7a2d6d072', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'f2f95a33-ad8a-576c-9ec4-563e8ad57801', 'the small sac under the liver that stores and releases bile', '胆囊', '肝下储存胆汁的囊。结石常见。不要把胆管（bile duct）或肝脏本身写成 gallbladder。'),
  ('e4b96670-6e9e-5c6b-a10c-dbc80ee86f4c', 'medical_english:anatomy:pancreas:noun', 'dc2859bc-a7e2-5edc-b8fc-5248d0e49904', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'f2f95a33-ad8a-576c-9ec4-563e8ad57801', 'the gland behind the stomach that makes digestive enzymes and insulin', '胰；胰腺', '既分泌消化酶又分泌胰岛素。上腹痛加酶升高才考虑胰腺炎，不要把所有血糖异常都写成胰腺查体发现。'),
  ('247b59b8-2efe-5443-abc8-50a228777676', 'medical_english:anatomy:cartilage:noun', '94df5be1-0847-5e67-a4d4-74e7b37ab0c2', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'f2f95a33-ad8a-576c-9ec4-563e8ad57801', 'firm, flexible connective tissue that covers joints and supports some airways', '软骨', '关节面或气管环的弹性结缔组织。磨损可致骨关节炎。不要把韧带撕裂或骨折直接写成 cartilage injury。'),
  ('baee06bc-aadf-583a-a82b-cda8b8e408b9', 'medical_english:anatomy:ureter:noun', '6691d0a3-66de-5404-8a8d-41ea1d94c417', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'f2f95a33-ad8a-576c-9ec4-563e8ad57801', 'the tube that carries urine from a kidney to the bladder', '输尿管', '肾到膀胱的管道。尿道是 urethra，不要写反。腰腹痛伴血尿常提输尿管结石，但要有影像或尿检支持。'),
  ('3a1432a1-d03f-5282-a277-5357a01f5220', 'medical_english:anatomy:thyroid:noun', '825798ca-4603-5dfd-994f-8e223db8df7d', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'f2f95a33-ad8a-576c-9ec4-563e8ad57801', 'the endocrine gland in the neck that sets basal metabolic rate', '甲状腺', '颈前分泌甲状腺激素的腺体。肿大写 goiter。心悸或怕热要查功能，不要把所有颈部肿块都写成 thyroid。'),
  ('7883c5ba-d768-5c2d-bbbd-2bf640934a2c', 'medical_english:anatomy:lymph-node:noun', '6a4f6f54-3caf-5131-966f-0b64e31ee126', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'f2f95a33-ad8a-576c-9ec4-563e8ad57801', 'small lymphoid filters along lymphatic vessels that trap antigen and cells', '淋巴结', '沿淋巴管分布的过滤结构。肿大写 lymphadenopathy。不要把所有颈部包块都写成淋巴结，唾液腺也常见。'),
  ('48dd9cb1-520b-5307-843c-ff83e28514bc', 'medical_english:physiology:hormone:noun', '9ec936f0-dbe8-5a7a-8541-eb615f2820f2', '52d53e9d-b343-50d9-b0d8-059b2540f890', '0419c1eb-5b7b-5fdc-aacb-c4daf1afd345', 'a chemical messenger released into blood that acts on distant target cells', '激素', '入血后作用于远处细胞的信使。神经递质主要在突触局部起效。写某种激素前要能点出腺体或靶器官。'),
  ('4065d074-6ab4-5817-97f4-03c130315b6a', 'medical_english:physiology:absorption:noun', 'ccb02a03-0a55-5f2b-98ab-d98465f54ce8', '52d53e9d-b343-50d9-b0d8-059b2540f890', '0419c1eb-5b7b-5fdc-aacb-c4daf1afd345', 'uptake of nutrients or drugs from a lumen into blood or lymph', '吸收', '从管腔进入血液或淋巴才写 absorption。吞咽是 ingestion，排出是 elimination。腹泻时可写吸收不良，但要有依据。'),
  ('cccfb045-356b-5181-b579-b751184f823b', 'medical_english:physiology:elimination:noun', '37052224-d3cc-5c23-91e2-8fd4e5bed46a', '52d53e9d-b343-50d9-b0d8-059b2540f890', '0419c1eb-5b7b-5fdc-aacb-c4daf1afd345', 'removal of waste or unused material from the body, often in feces or urine', '排泄；清除', '把废物送出体外才写 elimination。吸收是进血，分泌是腺体放出。药物清除也可说 elimination，但要标明途径。'),
  ('6b4d338a-e543-5bf7-9528-010a70242235', 'medical_english:physiology:enzyme:noun', '7f5b93f2-12bf-5372-aeda-27a947b8d654', '52d53e9d-b343-50d9-b0d8-059b2540f890', '0419c1eb-5b7b-5fdc-aacb-c4daf1afd345', 'a protein catalyst that speeds a specific biochemical reaction', '酶', '加速特定反应的蛋白质。心肌酶升高提示心肌损伤，但不等于梗死已经证实。不要把激素写成 enzyme。'),
  ('81e1a7db-6707-5290-a065-df9ffff888c5', 'medical_english:physiology:bile:noun', '4ee869a8-7a0a-5e92-a38c-b221c86ff2c6', '52d53e9d-b343-50d9-b0d8-059b2540f890', '0419c1eb-5b7b-5fdc-aacb-c4daf1afd345', 'the liver secretion that helps digest fats and carries bilirubin into the gut', '胆汁', '肝脏分泌、胆囊储存的消化液。黄疸可与胆汁淤积有关，但先分清肝细胞性还是梗阻性，不要见黄就写 bile 堵塞。'),
  ('e668b56a-d69d-545e-8c47-90b96a559095', 'medical_english:pathology:hereditary:adjective', '1289265e-a245-5b4f-9090-0a80f7dea958', '52d53e9d-b343-50d9-b0d8-059b2540f890', '3f8e08d5-d603-52c6-a794-038712ff8d03', 'passed from parent to child through genetic material', '遗传性的', '通过遗传物质从亲代传到子代才写 hereditary。家族聚集也可能是共同环境。没有谱系或基因证据时，先写 family history。'),
  ('01dfa7f9-8968-54b5-9037-d4978a1807ab', 'medical_english:pathology:abscess:noun', '2e0819d7-9d01-5418-8b95-90c522baaad3', '52d53e9d-b343-50d9-b0d8-059b2540f890', '3f8e08d5-d603-52c6-a794-038712ff8d03', 'a localized collection of pus walled off in tissue', '脓肿', '组织里被包住的脓腔才写 abscess。单纯蜂窝织炎还没有腔。引流常是关键，不要把所有红肿热痛都升级成脓肿。'),
  ('3f2d0fd9-f187-56d7-bd53-469fcc507acc', 'medical_english:pathology:obesity:noun', '8d1a8400-7ef8-59f9-b129-1af05ef7cf1f', '52d53e9d-b343-50d9-b0d8-059b2540f890', '3f8e08d5-d603-52c6-a794-038712ff8d03', 'excess body fat meeting a defined clinical threshold such as BMI class', '肥胖（临床分级）', '达到约定临床阈值（如 BMI 分级）才写 obesity。病历里作危险因素记录，不要写成道德评价，也不要用过时侮辱性标签。'),
  ('c3df4820-52b2-5034-8c79-1121bc2b2dfe', 'medical_english:pathology:prolapse:noun', '1f21cbb5-8331-5ac4-ace0-4d49e0546454', '52d53e9d-b343-50d9-b0d8-059b2540f890', '3f8e08d5-d603-52c6-a794-038712ff8d03', 'downward or outward displacement of an organ from its usual position', '脱垂', '器官从正常位置向下或向外脱出才写 prolapse。痔和直肠脱垂不是同一回事。没有查体所见不要只凭主诉定脱垂。'),
  ('8d0b6b0a-0a4a-51ef-add5-7809e4e1da89', 'medical_english:pharmacology:insulin:noun', 'aac55aaf-2da6-52d9-ba58-c51dfed28a84', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'be176af9-cee2-5fc3-a8c1-dabaf200bb70', 'the pancreatic hormone, or its drug form, that lowers blood glucose', '胰岛素', '胰腺激素或其制剂，作用是降血糖。胰高血糖素作用相反。写剂量和剂型，不要把所有降糖药都写成 insulin。'),
  ('ba4718a6-9451-5b37-a1e7-c8df3db1fbac', 'medical_english:pharmacology:adrenaline:noun', '36410cab-844c-59d1-a43f-8844d808ae16', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'be176af9-cee2-5fc3-a8c1-dabaf200bb70', 'epinephrine, the adrenal hormone used as a drug for anaphylaxis and arrest', '肾上腺素', '教材常用 adrenaline，病历和药品名常写 epinephrine，是同一物质。用于过敏性休克或心跳骤停，不要把紧张出汗随口写成需要 adrenaline。'),
  ('1bd9eae4-38cf-5d27-83da-7055328299ca', 'medical_english:pharmacology:glucagon:noun', '53d25635-fb6e-5dbd-9900-94dccd5596b0', '52d53e9d-b343-50d9-b0d8-059b2540f890', 'be176af9-cee2-5fc3-a8c1-dabaf200bb70', 'the pancreatic hormone, or its drug form, that raises blood glucose', '胰高血糖素', '升高血糖，与胰岛素相反。严重低血糖且无法进食时可注射。不要把日常点心写成 glucagon 治疗。'),
  ('ff7bb63c-e547-55be-ae6e-d8191dee4006', 'medical_english:laboratory:sodium:noun', 'f5f9c663-d804-5c8f-9d98-13140282041b', '52d53e9d-b343-50d9-b0d8-059b2540f890', '10e2306a-068b-5b0d-be9c-deb0606e5aae', 'the main extracellular cation reported on a metabolic panel', '钠（血钠等电解质）', '代谢组合里的细胞外主要阳离子。低钠要看是否真正缺钠还是水过多。不要把食盐摄入直接写成血钠数字。'),
  ('ae478918-5235-559d-93a2-18ce0d22b67e', 'medical_english:laboratory:potassium:noun', '7aa57dd4-258f-53bb-a485-e0938f1a6eae', '52d53e9d-b343-50d9-b0d8-059b2540f890', '10e2306a-068b-5b0d-be9c-deb0606e5aae', 'the main intracellular cation whose blood level affects heart rhythm', '钾（血钾等电解质）', '细胞内主要阳离子，血钾高低可影响心律。溶血标本可假性升高。补钾或降钾都要对照心电图，不要只看一个数字。')
on conflict (id) do update set
  stable_key = excluded.stable_key,
  word_id = excluded.word_id,
  module_id = excluded.module_id,
  category_id = excluded.category_id,
  meaning_en = excluded.meaning_en,
  meaning_zh = excluded.meaning_zh,
  usage_note = excluded.usage_note;

insert into public.contexts (id, stable_key, word_sense_id, context_sentence, target_text, plain_english_paraphrase, sentence_translation_zh, collocations, context_genre, source_type, source_title, source_url, doi, pmid)
values
  ('56875572-26b8-5173-99b6-e28733e18d57', 'medical_english:anatomy:esophagus:noun:med-anatomy-esophagus-001', 'de884c93-bb58-52ef-8ede-d7699a101356', 'Swallowed barium outlined a narrowing in the lower esophagus.', 'esophagus', 'The swallow study showed a tight segment in the lower food pipe leading to the stomach.', '吞钡检查勾勒出食管下段狭窄。', array['lower esophagus', 'esophagus and stomach', 'irritation of the esophagus']::text[], 'medical_textbook', 'original_example', null, null, null, null),
  ('dad9691d-d056-5236-8be5-e0d9f98febac', 'medical_english:anatomy:trachea:noun:med-anatomy-trachea-001', '761d6543-ad52-587a-bc95-e2b7c49b766f', 'A foreign body lodged in the trachea caused sudden noisy breathing.', 'trachea', 'Something stuck in the windpipe made the child breathe with a sudden harsh sound.', '异物卡在气管内，引起突然的响亮呼吸。', array['cervical trachea', 'trachea and bronchi', 'obstruction of the trachea']::text[], 'medical_textbook', 'original_example', null, null, null, null),
  ('84e13980-98dc-57e8-a892-d60b3bfad986', 'medical_english:anatomy:capillary:noun:med-anatomy-capillary-001', '0f08010a-3c5f-5b73-9b16-0bc3437352eb', 'Oxygen leaves the blood in the capillaries of the alveoli.', 'capillaries', 'Oxygen moves out of the blood in the tiniest lung vessels next to the air sacs.', '氧气在肺泡毛细血管处离开血液。', array['pulmonary capillaries', 'capillary refill', 'capillary wall']::text[], 'medical_textbook', 'original_example', null, null, null, null),
  ('a761bece-6788-59d6-b46c-4443d3a6a9d3', 'medical_english:anatomy:spleen:noun:med-anatomy-spleen-001', '44485df2-7f87-5d1f-86ed-cdb5d265ee5b', 'The enlarged spleen was palpable below the left costal margin.', 'spleen', 'The swollen organ under the left ribs could be felt below the rib edge.', '肿大的脾在左肋缘下可触及。', array['enlarged spleen', 'rupture of the spleen', 'spleen size']::text[], 'medical_record', 'original_example', null, null, null, null),
  ('c4a3afc3-38f9-53bd-ad08-34fae5fb91ac', 'medical_english:anatomy:gallbladder:noun:med-anatomy-gallbladder-001', '1d480893-7b4a-5ea0-bd40-f173ebc387f0', 'Ultrasound showed stones within a thick-walled gallbladder.', 'gallbladder', 'The scan found stones inside the bile-storage sac, whose wall was thicker than usual.', '超声显示胆囊壁增厚并有结石。', array['gallbladder wall', 'gallbladder stones', 'remove the gallbladder']::text[], 'imaging_report', 'original_example', null, null, null, null),
  ('bc4ce0e3-9498-5687-bf50-55d3c5fe1fdf', 'medical_english:anatomy:pancreas:noun:med-anatomy-pancreas-001', 'e4b96670-6e9e-5c6b-a10c-dbc80ee86f4c', 'The tail of the pancreas lies near the spleen in the left upper abdomen.', 'pancreas', 'The far end of this digestive-and-hormone gland sits close to the spleen on the left.', '胰尾在左上腹靠近脾。', array['head of the pancreas', 'inflammation of the pancreas', 'pancreas and duodenum']::text[], 'medical_textbook', 'original_example', null, null, null, null),
  ('151295a4-e40c-5fa8-b9f6-851e5982120b', 'medical_english:anatomy:cartilage:noun:med-anatomy-cartilage-001', '247b59b8-2efe-5443-abc8-50a228777676', 'Worn knee cartilage can make the joint space look narrow on a radiograph.', 'cartilage', 'When the smooth lining of the knee wears down, the gap between the bones looks smaller on X-ray.', '膝关节软骨磨损可使影像上关节间隙变窄。', array['articular cartilage', 'cartilage wear', 'tracheal cartilage']::text[], 'medical_textbook', 'original_example', null, null, null, null),
  ('3968c295-d1f2-5473-9370-ad86cd56e7b8', 'medical_english:anatomy:ureter:noun:med-anatomy-ureter-001', 'baee06bc-aadf-583a-a82b-cda8b8e408b9', 'A stone in the right ureter caused flank pain and blood in the urine.', 'ureter', 'A stone stuck in the tube from the right kidney to the bladder caused side pain and bloody urine.', '右侧输尿管结石引起腰痛和血尿。', array['ureter stone', 'dilated ureter', 'left ureter']::text[], 'imaging_report', 'original_example', null, null, null, null),
  ('052010a8-af59-5dac-8729-477bca664117', 'medical_english:anatomy:thyroid:noun:med-anatomy-thyroid-001', '3a1432a1-d03f-5282-a277-5357a01f5220', 'A firm nodule was felt in the right lobe of the thyroid.', 'thyroid', 'The examiner felt a hard lump in the right half of the neck gland that controls metabolism.', '甲状腺右叶触及一质韧结节。', array['thyroid nodule', 'thyroid gland', 'enlarged thyroid']::text[], 'medical_record', 'original_example', null, null, null, null),
  ('a1fb7310-3022-566c-a92a-3688da99c859', 'medical_english:anatomy:lymph-node:noun:med-anatomy-lymph-node-001', '7883c5ba-d768-5c2d-bbbd-2bf640934a2c', 'Tender cervical lymph nodes appeared with the pharyngitis.', 'lymph nodes', 'Sore glands in the neck showed up at the same time as the sore throat.', '咽炎同时出现颈部淋巴结压痛。', array['cervical lymph nodes', 'enlarged lymph nodes', 'drain to lymph nodes']::text[], 'medical_record', 'original_example', null, null, null, null),
  ('d5be5954-9bb3-5951-bc8e-7f636695f48b', 'medical_english:physiology:hormone:noun:med-physiology-hormone-001', '48dd9cb1-520b-5307-843c-ff83e28514bc', 'Insulin and glucagon are hormones that keep blood glucose in range.', 'hormones', 'Insulin and glucagon are blood-borne messengers that help keep sugar from swinging too far.', '胰岛素和胰高血糖素是维持血糖范围的激素。', array['peptide hormone', 'hormone level', 'release of hormones']::text[], 'medical_textbook', 'original_example', null, null, null, null),
  ('9e1e4037-68ce-5345-9fc0-da5e34f34d4a', 'medical_english:physiology:absorption:noun:med-physiology-absorption-001', '4065d074-6ab4-5817-97f4-03c130315b6a', 'Most nutrient absorption occurs in the small intestine.', 'absorption', 'Most food substances move into the blood from the small bowel rather than from the stomach.', '营养吸收主要发生在小肠。', array['nutrient absorption', 'drug absorption', 'impaired absorption']::text[], 'medical_textbook', 'original_example', null, null, null, null),
  ('75f73665-e684-5cb9-a5eb-0e1efec98135', 'medical_english:physiology:elimination:noun:med-physiology-elimination-001', 'cccfb045-356b-5181-b579-b751184f823b', 'Fiber speeds the elimination of stool through the colon.', 'elimination', 'Dietary fiber helps leftover material leave the body through the large bowel.', '膳食纤维加快结肠内粪便的排出。', array['elimination of stool', 'renal elimination', 'delay in elimination']::text[], 'medical_textbook', 'original_example', null, null, null, null),
  ('f40cac54-9cac-5ca0-9a2a-25f55811e691', 'medical_english:physiology:enzyme:noun:med-physiology-enzyme-001', '6b4d338a-e543-5bf7-9528-010a70242235', 'Pancreatic enzymes in the blood rose after the attack of abdominal pain.', 'enzymes', 'Digestive proteins made by the pancreas leaked into the blood after the spell of belly pain.', '腹痛发作后血中胰腺酶升高。', array['digestive enzymes', 'cardiac enzymes', 'enzyme activity']::text[], 'laboratory_report', 'original_example', null, null, null, null),
  ('f3d66d92-badc-5311-87a1-4170ae4bb383', 'medical_english:physiology:bile:noun:med-physiology-bile-001', '81e1a7db-6707-5290-a065-df9ffff888c5', 'The liver secretes bile that is stored in the gallbladder between meals.', 'bile', 'The fat-digesting fluid made by the liver is held in the gallbladder until the next meal.', '肝脏产生的胆汁在餐间储存在胆囊中。', array['flow of bile', 'bile salts', 'obstruction of bile']::text[], 'medical_textbook', 'original_example', null, null, null, null),
  ('209dbf6f-0418-55c1-afd4-4b1e834d66bd', 'medical_english:pathology:hereditary:adjective:med-pathology-hereditary-001', 'e668b56a-d69d-545e-8c47-90b96a559095', 'A hereditary clotting disorder explained the unprovoked leg thrombosis.', 'hereditary', 'A clotting problem handed down in the family helped explain the clot that formed without injury or surgery.', '遗传性凝血障碍解释了这次无诱因的下肢血栓。', array['hereditary disease', 'hereditary pattern', 'hereditary deficiency']::text[], 'medical_record', 'original_example', null, null, null, null),
  ('48215afc-3670-5c34-a257-43167eb57140', 'medical_english:pathology:abscess:noun:med-pathology-abscess-001', '01dfa7f9-8968-54b5-9037-d4978a1807ab', 'CT confirmed a drainable abscess next to the sigmoid colon.', 'abscess', 'The scan showed a pocket of pus beside the lower large bowel that could be drained.', 'CT 证实乙状结肠旁有可引流的脓肿。', array['drain an abscess', 'abscess formation', 'hepatic abscess']::text[], 'case_report', 'original_example', null, null, null, null),
  ('48a18ecb-03be-522d-af55-1e75dd1500a6', 'medical_english:pathology:obesity:noun:med-pathology-obesity-001', '3f2d0fd9-f187-56d7-bd53-469fcc507acc', 'Class II obesity was listed as a risk factor for the new diagnosis of type 2 diabetes.', 'obesity', 'Excess body fat meeting a clinical cutoff was recorded as one risk factor for newly found type 2 diabetes.', '肥胖被列为新诊断 2 型糖尿病的危险因素。', array['class I obesity', 'obesity as a risk factor', 'childhood obesity']::text[], 'medical_record', 'original_example', null, null, null, null),
  ('9b76c883-e004-5893-bc4d-94898234a583', 'medical_english:pathology:prolapse:noun:med-pathology-prolapse-001', 'c3df4820-52b2-5034-8c79-1121bc2b2dfe', 'Pelvic examination showed uterine prolapse to the hymenal ring.', 'prolapse', 'The pelvic exam found the uterus had descended as far as the hymenal opening.', '盆腔检查见子宫脱垂达处女膜环。', array['uterine prolapse', 'rectal prolapse', 'valve prolapse']::text[], 'medical_record', 'original_example', null, null, null, null),
  ('d94f03ab-bdf5-5c3c-8176-ddc9d0413664', 'medical_english:pharmacology:insulin:noun:med-pharmacology-insulin-001', '8d0b6b0a-0a4a-51ef-add5-7809e4e1da89', 'Basal insulin was added when metformin no longer held fasting glucose.', 'insulin', 'A long-acting insulin shot was started after metformin could not keep the morning sugar down.', '二甲双胍无法控制空腹血糖后加用基础胰岛素。', array['basal insulin', 'insulin dose', 'insulin resistance']::text[], 'clinical_guideline', 'original_example', null, null, null, null),
  ('b8d76fdd-f149-5d61-929f-e755ab36a428', 'medical_english:pharmacology:adrenaline:noun:med-pharmacology-adrenaline-001', 'ba4718a6-9451-5b37-a1e7-c8df3db1fbac', 'Intramuscular adrenaline was given at the first sign of anaphylaxis.', 'adrenaline', 'A shot of epinephrine went into muscle as soon as a severe allergic reaction began.', '一出现过敏性休克征象即肌内注射肾上腺素。', array['intramuscular adrenaline', 'adrenaline infusion', 'adrenaline and noradrenaline']::text[], 'clinical_guideline', 'original_example', null, null, null, null),
  ('5eb1d3f0-c833-5c3c-af70-6a1fe45cb89d', 'medical_english:pharmacology:glucagon:noun:med-pharmacology-glucagon-001', '1bd9eae4-38cf-5d27-83da-7055328299ca', 'A glucagon injection was used when the patient could not swallow sugar.', 'glucagon', 'A shot that raises blood sugar was given because the patient could not take sugar by mouth.', '患者无法吞服糖时使用了胰高血糖素注射。', array['glucagon injection', 'glucagon kit', 'glucagon and insulin']::text[], 'clinical_guideline', 'original_example', null, null, null, null),
  ('66c49af4-5c1c-5605-b944-2e2816da548a', 'medical_english:laboratory:sodium:noun:med-laboratory-sodium-001', 'ff7bb63c-e547-55be-ae6e-d8191dee4006', 'The metabolic panel showed a sodium of 128 mmol/L.', 'sodium', 'The blood chemistry listed a low sodium value of 128 millimoles per liter.', '代谢组合显示血钠 128 mmol/L。', array['serum sodium', 'low sodium', 'correct the sodium']::text[], 'laboratory_report', 'original_example', null, null, null, null),
  ('dee992e1-a23d-5239-b8f4-cb7a7cb41348', 'medical_english:laboratory:potassium:noun:med-laboratory-potassium-001', 'ae478918-5235-559d-93a2-18ce0d22b67e', 'Peaked T waves appeared after the potassium rose to 6.4 mmol/L.', 'potassium', 'The T waves became tall and pointed once the blood potassium reached 6.4 millimoles per liter.', '血钾升至 6.4 mmol/L 后出现高尖 T 波。', array['serum potassium', 'potassium replacement', 'high potassium']::text[], 'laboratory_report', 'original_example', null, null, null, null)
on conflict (id) do update set
  stable_key = excluded.stable_key,
  word_sense_id = excluded.word_sense_id,
  context_sentence = excluded.context_sentence,
  target_text = excluded.target_text,
  plain_english_paraphrase = excluded.plain_english_paraphrase,
  sentence_translation_zh = excluded.sentence_translation_zh,
  collocations = excluded.collocations,
  context_genre = excluded.context_genre,
  source_type = excluded.source_type,
  source_title = excluded.source_title,
  source_url = excluded.source_url,
  doi = excluded.doi,
  pmid = excluded.pmid;

insert into public.cards (id, stable_key, word_sense_id, context_id, card_type, active)
values
  ('f770fc6d-c692-5d96-962c-7985d2b533e6', 'med-anatomy-esophagus-001', 'de884c93-bb58-52ef-8ede-d7699a101356', '56875572-26b8-5173-99b6-e28733e18d57', 'context_recall', true),
  ('2cbc3059-a217-5db6-bda2-e5b55d8e4a27', 'med-anatomy-trachea-001', '761d6543-ad52-587a-bc95-e2b7c49b766f', 'dad9691d-d056-5236-8be5-e0d9f98febac', 'context_recall', true),
  ('ba1d0db1-6927-5e93-bdb6-126d287b6c11', 'med-anatomy-capillary-001', '0f08010a-3c5f-5b73-9b16-0bc3437352eb', '84e13980-98dc-57e8-a892-d60b3bfad986', 'context_recall', true),
  ('54a442c4-4b8d-59fa-8f39-f3bfb13c4201', 'med-anatomy-spleen-001', '44485df2-7f87-5d1f-86ed-cdb5d265ee5b', 'a761bece-6788-59d6-b46c-4443d3a6a9d3', 'context_recall', true),
  ('3e948cfd-6d76-5866-93ea-a97b76655146', 'med-anatomy-gallbladder-001', '1d480893-7b4a-5ea0-bd40-f173ebc387f0', 'c4a3afc3-38f9-53bd-ad08-34fae5fb91ac', 'context_recall', true),
  ('61ce12f8-85ec-5851-b313-ff3ab154eed3', 'med-anatomy-pancreas-001', 'e4b96670-6e9e-5c6b-a10c-dbc80ee86f4c', 'bc4ce0e3-9498-5687-bf50-55d3c5fe1fdf', 'context_recall', true),
  ('70b02447-8120-5a1b-8ab4-87b840b229fa', 'med-anatomy-cartilage-001', '247b59b8-2efe-5443-abc8-50a228777676', '151295a4-e40c-5fa8-b9f6-851e5982120b', 'context_recall', true),
  ('b2f9352f-ace8-54a9-ac7a-3c4f5e0a9fef', 'med-anatomy-ureter-001', 'baee06bc-aadf-583a-a82b-cda8b8e408b9', '3968c295-d1f2-5473-9370-ad86cd56e7b8', 'context_recall', true),
  ('057a1473-aed9-5cc4-82b3-d912055df1b6', 'med-anatomy-thyroid-001', '3a1432a1-d03f-5282-a277-5357a01f5220', '052010a8-af59-5dac-8729-477bca664117', 'context_recall', true),
  ('37a0fa62-e89b-5840-a9b5-11a59e9f9f83', 'med-anatomy-lymph-node-001', '7883c5ba-d768-5c2d-bbbd-2bf640934a2c', 'a1fb7310-3022-566c-a92a-3688da99c859', 'context_recall', true),
  ('eac4d985-0103-5672-b5ee-913fb0c579e2', 'med-physiology-hormone-001', '48dd9cb1-520b-5307-843c-ff83e28514bc', 'd5be5954-9bb3-5951-bc8e-7f636695f48b', 'context_recall', true),
  ('27943281-2b97-520c-bf1c-e2f945a89852', 'med-physiology-absorption-001', '4065d074-6ab4-5817-97f4-03c130315b6a', '9e1e4037-68ce-5345-9fc0-da5e34f34d4a', 'context_recall', true),
  ('7fa4d555-e007-591a-a975-33f4359edbaf', 'med-physiology-elimination-001', 'cccfb045-356b-5181-b579-b751184f823b', '75f73665-e684-5cb9-a5eb-0e1efec98135', 'context_recall', true),
  ('e6b273f1-a68a-52c0-9a92-d748b701e990', 'med-physiology-enzyme-001', '6b4d338a-e543-5bf7-9528-010a70242235', 'f40cac54-9cac-5ca0-9a2a-25f55811e691', 'context_recall', true),
  ('c13eebf3-8ad2-5789-b625-48d1e9f8eb0b', 'med-physiology-bile-001', '81e1a7db-6707-5290-a065-df9ffff888c5', 'f3d66d92-badc-5311-87a1-4170ae4bb383', 'context_recall', true),
  ('468a4129-eac5-5876-83c7-aaa1ec1ed7ec', 'med-pathology-hereditary-001', 'e668b56a-d69d-545e-8c47-90b96a559095', '209dbf6f-0418-55c1-afd4-4b1e834d66bd', 'context_recall', true),
  ('47ea919d-808d-5e19-afa8-6f500090237f', 'med-pathology-abscess-001', '01dfa7f9-8968-54b5-9037-d4978a1807ab', '48215afc-3670-5c34-a257-43167eb57140', 'context_recall', true),
  ('d85ec640-0f28-5d34-805d-39450e655370', 'med-pathology-obesity-001', '3f2d0fd9-f187-56d7-bd53-469fcc507acc', '48a18ecb-03be-522d-af55-1e75dd1500a6', 'context_recall', true),
  ('abe94f67-5264-5202-aac6-9cf8596692f4', 'med-pathology-prolapse-001', 'c3df4820-52b2-5034-8c79-1121bc2b2dfe', '9b76c883-e004-5893-bc4d-94898234a583', 'context_recall', true),
  ('713d0625-af12-53df-8835-7de2173d5f82', 'med-pharmacology-insulin-001', '8d0b6b0a-0a4a-51ef-add5-7809e4e1da89', 'd94f03ab-bdf5-5c3c-8176-ddc9d0413664', 'context_recall', true),
  ('5ab43704-956f-5f0e-bad2-86abbcfe5778', 'med-pharmacology-adrenaline-001', 'ba4718a6-9451-5b37-a1e7-c8df3db1fbac', 'b8d76fdd-f149-5d61-929f-e755ab36a428', 'context_recall', true),
  ('04ee12cb-a0ed-52e3-bea7-db3fe452703f', 'med-pharmacology-glucagon-001', '1bd9eae4-38cf-5d27-83da-7055328299ca', '5eb1d3f0-c833-5c3c-af70-6a1fe45cb89d', 'context_recall', true),
  ('e560cd95-ea99-508f-b2a2-80c069b81066', 'med-laboratory-sodium-001', 'ff7bb63c-e547-55be-ae6e-d8191dee4006', '66c49af4-5c1c-5605-b944-2e2816da548a', 'context_recall', true),
  ('0a1de695-fb39-5a84-974b-f2a02f1de3a4', 'med-laboratory-potassium-001', 'ae478918-5235-559d-93a2-18ce0d22b67e', 'dee992e1-a23d-5239-b8f4-cb7a7cb41348', 'context_recall', true)
on conflict (id) do update set
  stable_key = excluded.stable_key,
  word_sense_id = excluded.word_sense_id,
  context_id = excluded.context_id,
  card_type = excluded.card_type,
  active = excluded.active;

update public.cards
set active = false
where stable_key in (
  'med-symptoms-symptom-001',
  'med-signs-sign-001',
  'med-diagnosis-diagnose-001',
  'med-anatomy-artery-001',
  'med-anatomy-vein-001',
  'med-clinical-acute-001',
  'med-clinical-chronic-001',
  'med-symptoms-fever-001',
  'med-anatomy-abdomen-001',
  'med-anatomy-airway-001',
  'med-physiology-pulse-001',
  'med-pathology-infection-001',
  'med-pharmacology-dose-001',
  'med-pharmacology-allergy-001',
  'med-pharmacology-side-effect-001',
  'med-surgery-incision-001',
  'med-surgery-procedure-001',
  'med-surgery-suture-001',
  'med-treatment-discharge-001',
  'med-laboratory-culture-001',
  'med-laboratory-elevated-001'
);

commit;

