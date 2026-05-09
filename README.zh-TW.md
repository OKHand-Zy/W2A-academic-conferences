# W2A-academic-conferences

一個 [World2Agent](https://world2agent.com) 感測器，監控主要 AI/ML 學術會議，並在錄取論文公開時發出訊號。

## 支援的會議

| 會議 | 資料來源 |
|---|---|
| ICLR、NeurIPS、ICML | OpenReview API |
| ACL、EMNLP、NAACL、AACL | ACL Anthology |
| AAAI | AAAI OJS |
| INTERSPEECH | ISCA Archive |
| ICASSP、SLT | IEEE Xplore |

## 運作原理

感測器每 **6 小時**輪詢一次各會議來源。一旦偵測到某會議的錄取論文已公開，即發出 `academic.conference.papers_released` 訊號，並將通知記錄至 `state.json` 以避免重複發送。狀態每年自動重置。

## 訊號格式

**事件類型：** `academic.conference.papers_released`

**Payload：**
```json
{
  "conference": "NeurIPS",
  "year": 2025,
  "url": "https://openreview.net/group?id=NeurIPS.cc/2025/Conference"
}
```

## 安裝與執行

```bash
npm install
npm run build
npm start
```

## 授權

MIT

