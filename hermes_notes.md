⚕ *Hermes Agent*
────────────
*AI 導入服務商研究：企業通常買什麼、多少錢、最重要的 AI boost 是什麼？*

*先講結論*

對多數中小企業而言，最有價值的 AI 導入不是「買一個最強模型」，而是：

> 把一個高頻、重複、資料已存在的工作流程，接上企業知識、權限、現有系統與可量測 KPI，做成真正每天有人使用的 AI workflow。

通常最值得優先投資的是：

```text
資料整理與知識庫
+ 一個明確的 RAG / AI workflow
+ 現有系統整合
+ 權限與安全治理
+ 量測採用率與工時節省
```

這也正好是 Argus 可以切入的地方：不只是「幫企業使用 AI」，而是讓 AI 能安全使用跨部門資料。

---

*一、目前市場上的主要 solution provider 類型*

*1. 大型顧問與系統整合商*

*代表類型*

- Accenture
- Deloitte
- IBM Consulting
- PwC / EY / KPMG
- Capgemini
- TCS
- BCG / McKinsey / Bain

*通常提供*

- AI strategy / AI roadmap
- 企業 AI maturity assessment
- 部門與流程盤點
- ROI / business case
- Cloud architecture
- Data platform modernization
- RAG / AI agent implementation
- ERP、CRM、SAP、Oracle、Salesforce 串接
- AI governance、risk、compliance
- Change management
- 員工培訓
- Managed AI operations

這類服務適合大型企業、跨國公司、受監管產業或需要董事會級報告的組織。

*價格概念*

公開市場資料通常顯示：

```text
策略評估：USD 25,000–75,000+
PoC：USD 50,000–250,000+
單一正式 AI use case：USD 100,000–500,000+
企業級轉型：USD 500,000–5M+
```

這些是市場報價範圍，不是統一牌價；大型顧問公司的價格通常包含大量 project management、架構、資安、跨地區交付與 change management。[6]

---

*2. Cloud AI solution provider / Google Cloud partner*

*代表類型*

- Google Cloud Professional Services
- Google Cloud certified partners
- Pythian
- SADA 類型的 cloud integrator
- 其他 Vertex AI / Gemini implementation partner

Google Cloud 的官方生態系案例顯示，企業常見的 AI 導入方向包括：

- Employee agents
- Customer agents
- Data agents
- Supply-chain agents
- Natural-language interface for legacy systems
- Multimodal factory / physical-world analysis
- Security agents
- AI-assisted customer service

Google 的案例中也有台灣企業使用 Vertex AI 建置官方 LINE 客服 agent 的案例，這代表「企業資料 + AI agent + 現有 customer channel」是成熟且容易理解的導入方向。[1]

*通常提供*

- Google Cloud landing zone
- Cloud Storage / BigQuery / Firestore
- Vertex AI / Gemini
- RAG Engine / enterprise search
- Agent Engine
- Cloud Run deployment
- IAM / service account
- VPC、logging、monitoring
- Data ingestion pipeline
- Model evaluation
- Production support

Pythian 的公開服務頁面也將 Google AI、資料分析、資料庫、基礎建設與 managed services 放在同一個導入範圍內，這反映企業 AI 專案通常不只是 prompt 或 chatbot，而是完整 cloud/data/system integration。[11]

*價格*

Cloud provider 本身通常不是固定一次性服務價格，而是：

```text
顧問/建置費
+ Google Cloud usage
+ 模型 token 費用
+ storage / search / database
+ 維運費
```

Google Cloud Agent Platform 採 usage-based pricing，模型、訓練、部署、預測與 Cloud Storage 會分別計費，沒有單一「AI 導入月費」。正式預算必須依流量、模型、資料量與部署方式估算。[2]

*適合 Argus 的合作夥伴類型*

Argus 若要接 Google Cloud，最適合找能同時處理以下四項的 partner：

```text
Gemini / Vertex AI
+ Cloud Run
+ RAG / data engineering
+ IAM / security governance
```

只會做 Gemini chatbot、但不會處理 IAM、資料治理與 production deployment 的團隊，不適合 Argus 的定位。

---

*3. 台灣本地 AI 導入顧問與開發商*

*常見類型*

台灣市場大致可分為：

1. 顧問型
2. 開發整合型
3. 培訓型
4. 自動化服務型
5. 雲端與資料工程型
6. AI agent / chatbot 專門團隊

台灣的媒合平台上，常見服務包括：

- AI chatbot
- RAG knowledge base
- AI workflow automation
- n8n 串接
- AI Agent
- 企業內部知識庫
- 客服系統
- API integration
- AI model deployment
- AI 技術顧問

Tasker 的企業 AI 顧問頁面也能看到 RAG 後端、AI chatbot、AI workflow、AI knowledge base 與 AI agent 等不同類型的服務，並且多以專案或免費諮詢方式開始媒合。[5]

*台灣公開價格訊號*

依台灣公開市場資料，常見區間約為：

```text
單次 AI 顧問：
NT$3,000–10,000 / 小時

包月顧問：
NT$30,000–100,000 / 月

小型專案：
NT$5,000–100,000 / 次
```

PRO360 的價格資料指出，實際價格會受到案件規模、複雜度、顧問資歷與客製化程度影響。[9]

另一類台灣企業導入市場資料則將專案分成：

```text
AI 健檢 / 可行性評估：
NT$100,000–300,000

PoC：
NT$300,000–800,000

單一正式場景：
NT$800,000–2,500,000

跨部門、多 Agent、系統整合：
NT$2,500,000+
```

這類數字應視為市場估算，不是官方定價；資料品質、既有系統整合、權限、資安和驗收範圍會大幅影響價格。[6]

---

*4. SMB-focused AI consultant / fractional AI advisor*

*通常提供*

- AI readiness assessment
- 企業流程盤點
- 工具選型
- ChatGPT / Gemini / Copilot 導入
- 一個固定範圍 quick win
- 員工工作坊
- 部門 prompt / workflow 設計
- 基礎 automation
- 持續顧問服務

這類服務商通常不會替企業做大型 platform，重點是快速改善一個流程。

*價格*

公開 SMB 市場資料常見：

```text
顧問諮詢：USD 100–300 / 小時
固定範圍 quick win：USD 2,500–10,000
Fractional advisor：USD 1,500–8,000 / 月
```

典型 quick wins 包括客服分類、文件摘要、報價初稿、發票處理、內部知識問答與報表自動化。[10]

換算成台灣市場，不能直接用匯率等比例套用，因為本地人工成本、交付深度與企業預算不同；但可以當作服務分層的參考。

---

*5. 培訓與 AI adoption provider*

*通常提供*

- 全員 AI literacy
- Prompt workshop
- 部門工作坊
- Gemini / Microsoft Copilot / ChatGPT training
- AI policy training
- AI use-case ideation (1/3)
⚕ *Hermes Agent*
────────────
- Internal champion program
- Change management

*價格*

通常依以下方式報價：

```text
單場講座：NT$20,000–100,000+
半天/全天工作坊：NT$50,000–300,000+
企業客製化訓練：依人數與場次報價
```

訓練適合建立共識，但它本身不等於 AI 導入。

台灣經濟部相關文章也指出，顧問服務正從傳統的市場洞察、流程診斷、報告與工作坊，轉向可以持續運作、調用資料與執行任務的 AI agent platform。[8]

---

*二、企業通常購買的服務組合*

*Phase 1：AI readiness / discovery*

*交付內容*

- 訪談部門主管與一線員工
- 流程盤點
- 資料來源盤點
- AI use-case inventory
- ROI 優先級排序
- 資安與隱私風險
- 導入路線圖
- 一個建議 PoC

*時間*

```text
2–6 週
```

*預算*

```text
台灣：約 NT$100,000–300,000
國際：約 USD 10,000–75,000
```

*Phase 2：PoC / prototype*

*交付內容*

- 單一部門或單一 workflow
- RAG knowledge base
- Gemini / LLM integration
- 基礎資料 ingestion
- citations
- user testing
- initial evaluation
- ROI baseline

*時間*

```text
4–8 週
```

*預算*

```text
台灣：約 NT$300,000–800,000
國際：約 USD 25,000–250,000
```

*Phase 3：Production deployment*

*交付內容*

- Cloud deployment
- IAM
- SSO
- audit logs
- monitoring
- rate limits
- error handling
- document sync
- backend integrations
- evaluation pipeline
- training
- support

*時間*

```text
2–6 個月
```

*預算*

```text
台灣：約 NT$800,000–2,500,000+
國際：約 USD 100,000–500,000+
```

*Phase 4：Managed AI operations*

*交付內容*

- prompt/model tuning
- retrieval quality monitoring
- document refresh
- agent reliability monitoring
- security review
- cost optimization
- new use cases
- user adoption reporting

*價格*

```text
台灣：約 NT$30,000–300,000+ / 月
國際：約 USD 2,000–50,000+ / 月
```

大型 managed service 可以更高。

---

*三、最關鍵的 AI boost 是什麼？*

*第一名：把 AI 接到真實工作流，而不是只提供聊天視窗*

企業真正想要的不是：

```text
另一個 ChatGPT 視窗
```

而是：

```text
客戶問題進來
→ AI 找相關資料
→ AI 分類
→ AI 草擬回覆
→ AI 更新 CRM
→ AI 將複雜案件轉真人
```

或：

```text
採購資料更新
→ AI 比對規格與庫存
→ 找出風險
→ 建立待辦事項
→ 通知負責人
```

這才會產生可量測的：

- 回覆時間下降
- 人工處理量下降
- 錯誤減少
- 工作週期縮短
- 營收或轉換率提高

*第二名：企業資料的可用性*

很多 AI 專案失敗不是因為模型不夠強，而是：

- 文件散落在 PDF、Excel、Email、雲端硬碟
- 資料格式不一致
- 內容過期
- 沒有 owner
- 沒有版本
- 沒有權限標記
- 沒有清楚的業務詞彙

因此最重要的基礎工作通常是：

```text
資料盤點
→ 分類
→ 清理
→ metadata
→ owner
→ freshness
→ permissions
→ retrieval evaluation
```

這是 Argus 可以產生差異化的地方。

*第三名：Role + purpose-aware AI*

傳統企業權限通常回答：

```text
這個人能不能讀這個檔案？
```

但 AI 工作需要回答：

```text
這個人或 Agent 為了這個任務，
可以從這份資料看到哪些欄位？
```

例如同樣是 sales order：

```text
倉儲：
  產品、數量、倉區、履約狀態

行銷：
  產品、通路、營收、轉換率

財務：
  通路營收、折扣、對帳狀態

客服：
  這個客戶的相關訂單與客服歷史

CompanyWide AI：
  只看彙總，不看姓名、email、私人備註
```

這不是單純的 RAG，而是：

```text
RAG relevance
+
authorization
+
transformation
+
auditability
```

Argus 的核心價值就在這一層。

*第四名：把 AI output 變成可執行 action*

RAG 只回答問題，Agent 才能協助完成工作。

例如：

```text
AI 找到庫存異常
→ 建立盤點任務
→ 通知倉儲主管
→ 要求品質審查
→ 更新狀態
```

但這裡一定要有：

- tool permissions
- approval gates
- action scope
- rollback
- audit log
- human review

不能讓 AI 直接執行高風險動作。

*第五名：導入後量測與持續改善*

企業需要看到：

```text
每週省下多少工時？
回答正確率？
人工接管率？
使用率？
錯誤率？
每次任務成本？
資料新鮮度？
```

沒有這些 metrics，AI 專案很容易變成漂亮 demo，無法證明 ROI。

---

*四、我認為最值得賣的 AI 導入方案*

對 VEM / Argus，我不建議定位成一般「AI 顧問」。

可以設計成：

*Argus AI Enablement Sprint*

*方案 1：AI Opportunity Scan*

```text
期間：2 週
對象：還不知道從哪裡開始的中小企業
```

交付：

- 3–5 個 AI use cases
- 流程與資料盤點
- ROI 優先級
- 風險分類
- 哪些適合 RAG、automation、agent
- 一頁導入路線圖

建議測試價格：

```text
NT$50,000–150,000
```

這比大型顧問的完整 assessment 低，適合用來取得第一個付費入口。

*方案 2：One Workflow AI Pilot*

```text
期間：4–6 週
```

交付：

- 一個明確 workflow
- RAG 或 AI automation
- Gemini / Google Cloud integration
- role-based access
- evaluation set
- ROI baseline
- 使用者訓練
- demo + handover

建議測試價格：

```text
NT$300,000–800,000
```

最適合的 first use cases：

- 內部知識問答
- 客服輔助
- 報價/規格文件整理
- 供應商文件比較
- 合規/法規查詢
- 跨部門營運摘要

*方案 3：Safe AI Operations*

```text
期間：8–12 週
```

交付：

- 多資料來源 RAG
- role/purpose policy
- PII masking/redaction
- AI agent gateway
- audit log
- policy explainability
- human approval
- monitoring
- GCP deployment

建議測試價格：

```text
NT$800,000–2,000,000+
```

這才是 Argus 的高價值方案，而不是一般 chatbot 專案。

---

*五、對 Argus 最重要的定位建議*

不要說：

> 我們幫企業導入 AI。

這太泛，而且會與大量顧問公司、n8n 工程師、chatbot 廠商競爭。

比較好的說法是：

> *我們幫企業把 AI 接上真實工作流程，同時確保每個人和 AI agent 只取得完成任務所需的最小資料範圍。*

或：

> *讓 AI 擁有足夠的上下文，不必擁有完整的資料權限。*

*Argus 的差異*

一般 solution provider：

```text
選模型
做 chatbot
接 RAG
串 API
做自動化
```

Argus：
 (2/3)
 ⚕ *Hermes Agent*
────────────

```text
先辨識 identity
再辨識 purpose
找出相關資料
產生 recipient-specific view
遮罩/彙總/過濾
提供給 AI
保留 decision trail
```

這會讓 Argus 從一般 AI 導入服務，升級成：

```text
AI enablement + data governance + agent security
```

---

*六、我建議你最先鎖定的市場*

*第一優先：有 20–200 人、資料跨部門但沒有大型 IT 團隊的企業*

這類企業通常：

- 已經有很多 PDF、Excel、ERP、客服資料
- 老闆想導入 AI
- 員工各自使用 ChatGPT / Gemini
- 但害怕資料外洩
- 沒有完整 IAM 或 AI governance
- 無法負擔 Big 4 或大型 SI 的價格

這正是 Argus 的甜蜜點。

*最適合的第一批場景*

*製造業*

```text
規格書
品質報告
維修紀錄
供應商資料
客戶要求
```

Argus 可以讓：

```text
操作員、品管、採購、主管、供應商
```

看到不同的安全資料 view。

*零售與電商*

```text
訂單
客服
庫存
廣告
B2B pipeline
產品開發
```

你現在建立的 Victor dataset 就非常適合當第一個 demo。

*顧問與專業服務公司*

```text
客戶專案
研究報告
法規
交付文件
方法論
```

AI 可以找跨專案知識，但不應該讓一個客戶的資料流入另一個客戶的答案。

---

*七、最關鍵的執行建議*

如果你要實際賣 Argus，不要先做：

```text
通用 AI platform
```

先做：

```text
一個產業
一個 workflow
三種角色
一個 measurable KPI
```

例如 Victor 零售版：

```text
Workflow：
跨部門營運週報

Roles：
倉儲主管
行銷主管
CompanyWide AI agent

Sources：
訂單、庫存、客服、行銷、SOP

KPI：
週報製作時間
人工資料整併時間
敏感欄位暴露數
AI 回答引用率
```

這樣才容易在 4–8 週內完成一個可收費 pilot。

---

*最終答案：最 critical AI boost*

如果只能選一項，我會選：

> *安全地把 AI 接上企業跨部門資料與日常 workflow。*

不是單純：

```text
更強的模型
更多 prompt
更多 chatbot
```

而是：

```text
企業資料
→ 可檢索
→ 有權限
→ 有角色
→ 有目的
→ 可轉換
→ 可執行
→ 可稽核
```

這就是 Argus 最有機會建立差異化的地方。

*Sources*

[1] <https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders>

[2] <https://cloud.google.com/vertex-ai/pricing>

[5] <https://www.tasker.com.tw/business/ai-services>

[6] <https://joinx.co/article/choose-ai-adoption-company-2026>

[8] <https://www.moea.gov.tw/Mns/doit/industrytech/IndustryTech.aspx?menu_id=13545&it_id=642>

[9] <https://www.pro360.com.tw/price/ai_consultant>

[10] <https://iternal.ai/ai-consulting-for-small-business>

[11] <https://www.pythian.com/google-cloud-consulting/vertex>

*價格是公開市場資料整理的 indicative ranges，不是報價承諾；實際價格會受資料量、整合深度、資安要求、使用者數、部署地區與維運範圍影響。* (3/3)

⚕ *Hermes Agent*
────────────
*10 個最適合 Argus AI onboarding 的產業／公司類型*

我會優先找這類客戶：

```text
已經有大量內部資料
+ 多部門協作
+ AI 導入有明確需求
+ 但資料權限、個資、商業機密造成阻力
```

Argus 的差異不是「幫他們做一個 chatbot」，而是：

> 讓 AI 跨部門取用足夠的上下文，但每個人或 AI agent 只收到完成任務所需的資料。

以下公司名稱是 *prospect hypotheses*，不是表示它們目前正在尋找 Argus，也不是聲稱它們已經是客戶。

---

*1. 中大型製造商：台積電、鴻海、和碩、友達*

*為什麼適合*

製造企業同時擁有：

- 工程規格
- 生產 SOP
- 品質報告
- AOI / 檢測資料
- 維修紀錄
- 供應商文件
- 客戶規格
- 產線與人員資料

AI 若完全沒有資料，無法協助工程師；如果開放整個知識庫，又可能洩漏：

- 客戶專案
- 製程機密
- 供應商價格
- 未公開產品資訊
- 員工資料

*Argus use case*

```text
AI 品質與製造營運助手
```

同一個問題：

> 這批產品的異常是否需要停線？

不同角色取得不同 view：

```text
產線操作員：
  SOP、異常類型、立即處置

品管工程師：
  批次、缺陷分布、歷史趨勢

採購：
  供應商與批次風險

主管：
  聚合良率、停線風險、成本影響

供應商：
  只看核准後的改善要求
```

*Argus value*

```text
RAG 找到相關文件
Argus 避免跨客戶、跨供應商、跨專案資料混入答案
```

製造是我認為 Argus 最具差異化的垂直市場之一。

---

*2. 金融控股與銀行：國泰金、富邦金、中信金、玉山、台新*

*為什麼適合*

銀行有大量：

- 客戶資料
- 信用與風險資料
- 內規
- 法規
- 客服紀錄
- 分行作業手冊
- AML / fraud case
- 產品與保險政策

金融機構的 AI 導入需求很強，但資料外洩、模型風險、可稽核性和權限控制也更敏感。Deloitte 的金融機構調查指出，2025 年 94% 的大型銀行與 62% 的小型銀行使用 GenAI，因此「能安全擴大 AI 使用」本身就是明確需求。[14]

*Argus use case*

```text
分行與風控 AI copilot
```

例如：

> 這位客戶詢問房貸方案，我可以提供哪些說明？

```text
分行人員：
  只看該客戶允許的產品與政策資料

客服 agent：
  只看客服用途可用的資料

風控人員：
  可看風險規則與審查依據

一般行銷 agent：
  只能取得去識別化的客群統計
```

*Argus value*

- 欄位級遮罩
- purpose-based access
- 個人資料最小化
- policy decision log
- 回答引用與人工覆核
- 不讓 Gemini 自己決定誰有權限

金融機構是高價值市場，但銷售週期較長、驗證與資安要求也最高。

---

*3. 保險公司：國泰人壽、富邦人壽、南山人壽、新光人壽*

*為什麼適合*

保險業的文件和流程非常適合 RAG：

- 保單條款
- 理賠文件
- 核保規範
- 客戶往來紀錄
- 業務員手冊
- 法規與內規
- 醫療／事故文件

Google Cloud 的案例已展示 Gemini 和 Document AI 用於保險理賠文件擷取、分類與處理，這類流程通常同時涉及大量非結構化文件與高度敏感個資。[1]

*Argus use case*

```text
理賠與業務員 AI 助手
```

同一份案件：

```text
業務員：
  客戶可理解的保單與申請資訊

理賠人員：
  理賠條款、文件缺口、審查流程

法務／合規：
  規則、例外與法規依據

AI 客服：
  只能使用已核准的回覆內容

外部合作醫療單位：
  只看必要的案件欄位
```

*Argus value*

```text
不是只把理賠文件丟進 RAG，
而是每個角色看到不同的保單與案件 view。
```

這非常適合展示 RedactCore + Argus policy + Gemini。

---

*4. 醫院與醫療體系：中國醫藥大學附設醫院、台大醫院、長庚、北榮*

*為什麼適合*

醫療機構同時有：

- 病歷
- 檢驗結果
- 影像
- 醫療 SOP
- 藥品資料
- 保險與行政資料
- 研究資料
- 病患聯絡資訊

台灣醫療 AI 已經從單純技術導入走向治理成熟階段；衛福部也推動大規模 AI healthcare initiative，表示醫療 AI 的重點已不只是模型能力，而是安全、責任與資料治理。[12][13]

*Argus use case*

```text
醫療文件與行政 AI 助手
```

例如：

> 請整理這個病人的出院注意事項。

```text
醫師：
  可看完整臨床上下文

護理人員：
  看照護與出院執行資訊

行政人員：
  看掛號、帳務、流程欄位

研究人員：
  只看去識別化資料

病患客服 agent：
  只看可對病患公開的內容
```

*Argus value*

- 研究資料與臨床資料隔離
- 病患 PII / PHI 遮罩
- 依照醫療角色與用途產生 view
- AI 建議必須人工覆核
- 完整 provenance 和 audit

醫療是 Argus 高價值、高信任門檻市場，不適合一開始承諾自動診斷；應從行政文件、SOP 和研究資料查詢切入。

---

*5. 電信與大型客服：中華電信、遠傳、台灣大哥大*

*為什麼適合*

電信公司擁有：

- 客戶方案
- 設備與網路資料
- 維修紀錄
- 帳務
- 客服對話
- 技術手冊
- 企業客戶合約
- 地區網路資訊

Google Cloud 的案例顯示，電信業已使用 agent 處理複雜客服問題與營運流程。[1]

*Argus use case*

```text
客服與現場工程 AI 助手
```

```text
客服：
  客戶方案、帳務、公開故障資訊

現場工程師：
  設備、工單、技術 SOP

企業業務：
  該客戶合約與產品資料

網路維運：
  聚合故障與效能資料

外包維修商：
  只看指定工單必要欄位
```

*Argus value*

最重要的是避免：

```text
一個客服 agent
取得所有客戶、設備與企業合約資料
```

Argus 可以把同一個 agent request 變成：

```text
customer-support view
field-engineer view
enterprise-account view
vendor-work-order view
```

---

*6. 零售與電商：統一、全聯、家樂福台灣、momo、PChome*

*為什麼適合*

零售和電商的資料高度跨部門：

- 商品
- 庫存
- 訂單
- 會員
- 行銷活動
- 客服
- 門市
- 供應商
- 物流

台灣已有零售企業使用 Vertex AI 做個人化購物與搜尋；Google Cloud 的案例也提到 Carrefour Taiwan 與 FamilyMart 的 AI shopping/search 應用。[1]

*Argus use case*

```text
跨部門零售營運助手
```

例如：

> 哪些商品需要補貨？哪些活動值得加碼？哪些客服問題需要主管處理？

```text
行銷：
  活動、轉換率、營收

倉儲：
  庫存、倉區、品管、履約

客服：
  客服案件與公開產品資訊

採購：
  供應商與補貨週期

CompanyWide AI：
  只有聚合後的跨部門摘要
```

*Argus value*

這就是你目前 Victor dataset 最適合展示的市場。

尤其適合 Argus 的 pitch：

> RAG 可以跨訂單、庫存、客服和行銷資料回答；Argus 確保每個角色只收到完成任務所需的 view。

---

*7. 會計、審計與企業顧問：勤業眾信、資誠、安永、KPMG，以及中型會計師事務所*

*為什麼適合*

專業服務公司的資料通常按客戶、案件、團隊、權限嚴格隔離：

- 客戶合約
- 查核底稿
- 稅務資料
- 法規研究
- 專案文件
- 員工知識
- 報告與交付物

AI 可以顯著提升：

- 文件查找
- 查核摘要
- 法規比較
- 研究初稿
- 客戶問答
- 報告品質檢查

但最大的風險是：

```text
客戶 A 的資料出現在客戶 B 的 AI 答案
```

*Argus use case*

```text
Multi-tenant professional-services RAG
```

```text
案件團隊：
  只看該客戶／該 engagement

稅務團隊：
  看指定法規與該客戶資料

合夥人：
  看跨案件聚合指標

內部 AI：
  只看已核准的方法論與去識別化案例

客戶 portal：
  只看自己的 deliverables
```

*Argus value*

這是 Argus 最自然的 use case 之一：
 (1/3)
⚕ *Hermes Agent*
────────────

```text
tenant isolation
+ matter isolation
+ role/purpose view
+ client-safe sharing
```

此類客戶不只需要 RBAC，而需要「案件、客戶、目的、資料來源」一起判斷。

---

*8. 建築、工程與營造：台灣大型營造商、建築顧問、機電工程公司*

*為什麼適合*

建築工程資料常跨越：

- 設計圖
- 工程規範
- 採購
- 變更單
- 工地日誌
- 安全報告
- 承包商
- 預算與合約
- 客戶需求

Google Cloud 的案例也包含建設公司用 Gemini 建立集中式內部知識平台，支援銷售與法務流程。[1]

*Argus use case*

```text
工程專案 AI 助手
```

```text
工地主任：
  工地 SOP、安全、當日任務

設計團隊：
  圖面、規格、變更紀錄

採購：
  材料、供應商、交期

承包商：
  被核准的施工與安全要求

業主：
  進度與聚合風險

財務：
  預算、請款、合約變更
```

*Argus value*

避免：

- 承包商看到其他供應商報價
- 工地 agent 看到完整合約價格
- 業主看到內部談判備註
- 設計版本混用
- 過期 SOP 被 AI 引用

這是非常適合 RAG + document versioning + role-based view 的產業。

---

*9. 法律事務所與法務部門：大型律所、企業法務、智慧財產事務所*

*為什麼適合*

法律資料高度敏感且高度文件導向：

- 客戶案件
- 合約
- 訴訟文件
- 法規
- 法院文件
- 內部法律意見
- 特權資料
- 商業機密

Google Cloud 的案例提到法律 AI 用 Gemini 分析大量 eDiscovery 文件與複雜文件審查。[1]

*Argus use case*

```text
案件隔離的法律 RAG
```

```text
案件律師：
  該案件所有授權文件

研究律師：
  公開法規與核准研究資料

助理：
  文件索引、截止日期、工作項目

企業法務：
  本公司合約與政策

外部客戶：
  只看自己的文件與核准摘要

跨案件 AI：
  只看去識別化的 precedent
```

*Argus value*

Argus 必須防止：

```text
案件 A 的事實
→ 污染案件 B 的回答
```

並且將：

- attorney-client privilege
- matter boundary
- client boundary
- document version
- purpose
- human review

納入 retrieval 和 answer generation 前。

這是 Argus 的高價值、高痛點市場。

---

*10. 人力資源、招募與外包服務：104 類型平台、獵頭公司、大型企業 HR*

*為什麼適合*

HR 資料包含：

- 履歷
- 薪資
- 績效
- 面試紀錄
- 身分與聯絡資料
- 員工關係案件
- 部門 headcount
- 招募流程

AI 可以幫助：

- 履歷摘要
- 職缺匹配
- 面試摘要
- onboarding
- 員工政策問答
- 人力分析

但不同角色的資料權限差異極大。

*Argus use case*

```text
HR-safe AI copilot
```

```text
招募專員：
  只看正在處理的候選人和職缺

部門主管：
  看候選人能力摘要，不看不必要的敏感個資

HRBP：
  看部門層級趨勢

財務：
  看人力成本聚合

員工自助 agent：
  只看自己的制度與福利資訊

高階主管：
  看匿名化 headcount / retention
```

*Argus value*

防止 AI 回答：

- 某員工薪資
- 某候選人的敏感個資
- 主管私人評語
- 未公開的裁員計畫
- 不相關部門的績效資料

這個場景可以強烈展示：

```text
同一份 HR knowledge base
→ employee view
→ manager view
→ HR view
→ finance aggregate view
```

---

*優先排序：最值得先開發的 3 類*

*第一名：中型製造商*

*最適合 Argus 的理由*

```text
資料多
角色多
跨部門協作多
AI ROI 容易量測
對資料外洩高度敏感
```

*第一個 use case*

```text
品質／維修／供應商文件 AI 助手
```

*主要 KPI*

- 品質問題調查時間
- 工程師找文件時間
- SOP 查詢時間
- 重複資料整理時間
- 不當資料暴露數
- AI 建議人工修正率

---

*第二名：零售與電商*

*最適合的理由*

你已經有：

```text
Victor 組織角色
繁中 synthetic data
RAG documents
Argus demo cases
```

*第一個 use case*

```text
跨部門營運週報 AI
```

*Demo 會很清楚*

```text
per-file permission：
AI 不能跨檔案工作

unrestricted RAG：
AI 能工作但會看到太多

Argus：
AI 跨檔案工作，但得到 role-specific safe view
```

*主要 KPI*

- 週報製作時間
- 跨部門資料整理時間
- 回答引用率
- 敏感欄位被暴露數
- 人工覆核率

---

*第三名：金融／保險*

*最適合的理由*

資料敏感度最高，因此 Argus 的 data protection value 最容易被理解。

*但要注意*

這類客戶：

- 銷售週期長
- 需要資安與法遵審查
- 需要明確 audit trail
- 不會只因 chatbot demo 就採購

第一個 use case 應該從低風險的：

```text
內部政策查詢
客服輔助
文件分類
理賠文件摘要
```

開始，不要一開始做：

```text
自動核貸
自動理賠決策
自動投資建議
```

---

*最適合的 ICP 不是「最大公司」*

我建議 Argus 第一批鎖定：

```text
100–2,000 人
資料跨部門
已經在試用 Gemini / ChatGPT / Copilot
沒有成熟 AI governance
但有明確資安顧慮
```

這類公司通常比超大型企業更容易：

- 找到決策者
- 做 pilot
- 接觸資料 owner
- 在 4–8 週看到結果
- 將 pilot 轉正式專案

*理想買家角色*

不要只找 CTO。可以同時找：

- CIO / IT Director
- CISO / 資安主管
- Data / Analytics Head
- Digital Transformation Head
- COO
- 企業應用系統負責人
- 法遵／風險主管
- 業務流程主管

*Argus 的最佳切入訊息*

> 貴公司不需要在「完全不讓 AI 讀資料」和「把全部資料交給 AI」之間二選一。Argus 讓 AI 跨資料來源完成工作，但依照角色、任務和資料敏感度，只提供最小必要 context。

---

*十個目標類型總表*

| 優先 | 產業／公司類型 | 第一個 use case | Argus 核心價值 |
| --- | --- | --- | --- |
| 1 | 中大型製造商 | 品質與維修 AI 助手 | 工程、供應商、客戶資料分層 |
| 2 | 零售與電商 | 跨部門營運摘要 | 同時使用訂單、庫存、客服、行銷 |
| 3 | 銀行與金融控股 | 政策／客服／風控 copilot | PII、金融資料與 audit |
| 4 | 保險公司 | 理賠文件與業務助手 | 文件、醫療與客戶資料隔離 |
| 5 | 醫院與醫療體系 | 行政／SOP／研究 RAG | 病患資料與研究資料分離 |
| 6 | 電信商 | 客服與工程師 copilot | 客戶、設備、合約資料分層 |
| 7 | 會計／審計／顧問 | Multi-client knowledge RAG | 客戶與案件隔離 |
| 8 | 營造／工程公司 | 專案與規格文件助手 | 版本、承包商、預算權限 |
| 9 | 法律事務所 | Matter-isolated legal RAG | 案件界線與特權資料 |
| 10 | HR／招募服務商 | HR policy 與招聘 copilot | 個資、薪資、績效最小化 |

---

*我的建議*

Argus 不要同時做十個 vertical demo。應該先做兩個：

*Demo 1：Victor Retail*

最快展示：

```text
跨部門 RAG
+ role-based data view
+ 繁中情境
+ 可量測營運效率
```

*Demo 2：Manufacturing SafeOps*

最能拉開差異：

```text
品質／供應商／工程文件
+ 高資料敏感度
+ AI efficiency
+ Argus policy enforcement
```

最後的 positioning 可以是：
 (2/3)

 ⚕ *Hermes Agent*
────────────
> *Argus helps companies give AI broader operational context without giving AI unrestricted access to raw company data.*

或中文：

> *Argus 讓企業 AI 擁有更完整的工作上下文，但不必擁有完整的原始資料權限。*

*Sources*

[1] <https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders>

[8] <https://www.moea.gov.tw/Mns/doit/industrytech/IndustryTech.aspx?menu_id=13545&it_id=642>

[12] <https://www.trade.gov/market-intelligence/taiwan-ai-national-healthcare-initiative>

[13] <https://aicenter.mohw.gov.tw/AC/np-7293-208.html>

[14] <https://www.deloitte.com/dk/en/services/consulting/perspectives/ai-adoption-in-financial-institutions-balancing-growth-and-governance.html>

[15] <https://www.glean.com/perspectives/top-7-industries-with-stringent-ai-compliance-needs-in-2026>

以上公司是適合研究與 outbound 的潛在客戶，不代表其目前有採購需求或已採用 Argus。 (3/3)
