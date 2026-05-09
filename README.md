# W2A-academic-conferences

A [World2Agent](https://world2agent.com) sensor that monitors major AI/ML academic conferences and emits a signal when accepted papers become publicly available.

## Supported Conferences

| Conference | Source |
|---|---|
| ICLR, NeurIPS, ICML | OpenReview API |
| ACL, EMNLP, NAACL, AACL | ACL Anthology |
| AAAI | AAAI OJS |
| INTERSPEECH | ISCA Archive |
| ICASSP, SLT | IEEE Xplore |

## How It Works

The sensor polls each conference source every **6 hours**. Once a conference's accepted papers are detected as publicly available, it emits a `academic.conference.papers_released` signal and records the notification in `state.json` to avoid duplicate signals. State resets automatically each year.

## Signal

**Event type:** `academic.conference.papers_released`

**Payload:**
```json
{
  "conference": "NeurIPS",
  "year": 2025,
  "url": "https://openreview.net/group?id=NeurIPS.cc/2025/Conference"
}
```

## Setup

```bash
npm install
npm run build
npm start
```

## License

MIT
