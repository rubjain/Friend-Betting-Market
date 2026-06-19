/**
 * Terms of Use — structured copy for the legal page.
 * Deployments should have counsel review before production use.
 */

export const TERMS_META = {
  effectiveDate: "May 3, 2026",
  version: "2.0",
  documentTitle: "Terms of Use",
};

/** @typedef {{ type: string } & Record<string, unknown>} TermsBlock */

/** @type {{ id: string, title: string, blocks: TermsBlock[] }[]} */
export const TERMS_SECTIONS = [
  {
    id: "overview",
    title: "Overview & acceptance",
    blocks: [
      {
        type: "notice",
        variant: "important",
        text: "These Terms of Use (“Terms”) form a binding agreement between you and the operator of this Agora deployment (“we,” “us,” “our”). They govern access to and use of the website, applications, and related services (collectively, the “Service”). If you do not agree, do not use the Service.",
      },
      {
        type: "paragraph",
        text: "By creating an account, clicking to accept, or otherwise using the Service, you represent that you have the authority to enter these Terms and that you have read, understood, and agree to be bound by them, including any policies incorporated by reference (including our Privacy Policy).",
      },
      {
        type: "paragraph",
        text: "If you use the Service on behalf of an organization, you represent that you have authority to bind that organization, and “you” includes that organization.",
      },
    ],
  },
  {
    id: "definitions",
    title: "Definitions",
    blocks: [
      {
        type: "paragraph",
        text: "Capitalized terms have the meanings below or as stated elsewhere in these Terms.",
      },
      {
        type: "definitionList",
        items: [
          {
            term: "Content",
            def: "Text, graphics, data, software, market descriptions, pricing displays, and other materials made available through the Service.",
          },
          {
            term: "Markets",
            def: "Prediction-style contracts or binary outcomes offered within the Service, each subject to posted rules and resolution procedures.",
          },
          {
            term: "Play credits / virtual balance",
            def: "Non-cash ledger amounts shown in the Service for participation. Unless expressly stated in writing by us and permitted under applicable law, play credits have no cash value, are not redeemable for money, and are not insurance or any financial instrument.",
          },
          {
            term: "User Content",
            def: "Content you submit, upload, or transmit through the Service (for example display names, comments, or uploads where enabled).",
          },
        ],
      },
    ],
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    blocks: [
      {
        type: "paragraph",
        text: "We may modify these Terms from time to time. We will post the updated Terms and revise the “Effective date” at the top of this page. For material changes, we may also provide notice by email, in-product notice, or other reasonable means where we have your contact information.",
      },
      {
        type: "paragraph",
        text: "Your continued use of the Service after the effective date of updated Terms constitutes your acceptance. If you do not agree, you must stop using the Service and may close your account where available.",
      },
    ],
  },
  {
    id: "service",
    title: "The Service; demo & production environments",
    blocks: [
      {
        type: "paragraph",
        text: "Agora provides social prediction-market-style functionality: browsing Markets, viewing prices and outcomes, optional friend features, optional live or third-party data for context, and related tools. Features may vary by deployment, region, or account status.",
      },
      {
        type: "paragraph",
        text: "Unless we expressly identify functionality as real-money wagering, regulated gaming, or securities trading, you should assume that balances, deposits, withdrawals, and fills may be simulated, limited, or subject to additional verification and compliance gates before any production-money features are enabled.",
      },
      {
        type: "paragraph",
        text: "We may change, suspend, or discontinue any part of the Service, impose limits, or restrict access (including for maintenance, security, legal compliance, or abuse prevention) without liability except where prohibited by law.",
      },
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility; geographic and regulatory restrictions",
    blocks: [
      {
        type: "paragraph",
        text: "You must be at least the age of majority in your jurisdiction (and in no case under 13; if you are in the EEA/UK, under 16 where digital consent rules apply) to use the Service. By using the Service, you represent that you meet these requirements.",
      },
      {
        type: "paragraph",
        text: "You are solely responsible for determining whether your access to or use of prediction-market-style products is lawful where you live. We do not warrant that the Service is appropriate or available in any particular jurisdiction. We may block access from certain regions or persons (including government sanctions lists and similar restricted parties).",
      },
      {
        type: "paragraph",
        text: "If real-money or regulated features are offered in the future, additional eligibility checks (including identity verification, geolocation, and responsible-gaming controls) may be required as a condition of use.",
      },
    ],
  },
  {
    id: "accounts",
    title: "Registration, account security, & communications",
    blocks: [
      {
        type: "paragraph",
        text: "You must provide accurate, current information as requested and keep it updated. You may not create an account using false identity information or create multiple accounts to circumvent rules, limits, or enforcement.",
      },
      {
        type: "paragraph",
        text: "You are responsible for safeguarding credentials and for all activity under your account. Notify us promptly of any unauthorized access. We are not liable for losses arising from your failure to secure your account, except where liability cannot be excluded under mandatory law.",
      },
      {
        type: "paragraph",
        text: "You consent to receive Service-related communications electronically (including legal notices and security alerts) at the contact information you provide, subject to applicable law and any marketing preferences you set where required.",
      },
    ],
  },
  {
    id: "play-credits",
    title: "Play credits, risk disclosure & no professional advice",
    blocks: [
      {
        type: "notice",
        variant: "risk",
        text: "Participation in prediction markets involves risk of loss. Prices reflect collective expectations and can change rapidly. Outcomes may be uncertain until official resolution. Nothing on the Service is an offer to buy or sell securities, insurance, or gambling services unless expressly stated and offered only where licensed and lawful.",
      },
      {
        type: "paragraph",
        text: "Unless expressly stated otherwise in writing by us and permitted under applicable law, play credits and similar ledger amounts are not deposits at a bank, are not FDIC or equivalent insured, are not redeemable for cash, and may be forfeited, adjusted, or reset as described in these Terms or in-product notices (including for abuse, error correction, or promotional programs).",
      },
      {
        type: "paragraph",
        text: "The Service does not provide investment, legal, tax, or gambling advice. You should consult qualified professionals regarding your circumstances. Past performance, simulated results, or leaderboard rankings do not guarantee future results.",
      },
    ],
  },
  {
    id: "markets-rules",
    title: "Markets, settlements & disputes",
    blocks: [
      {
        type: "paragraph",
        text: "Each Market has a published rule set describing what YES/NO (or other outcomes) means, resolution sources, handling of postponements, cancellations, data errors, and related edge cases. Those posted rules, as interpreted and applied by us in good faith consistent with the stated sources, control settlement.",
      },
      {
        type: "paragraph",
        text: "You agree that our resolution decisions are binding except for manifest error or as provided in a formal dispute process we publish. If you believe an error occurred, follow any dispute or appeal mechanism we provide; absent such a process, contact us with detailed information and we will review in good faith.",
      },
      {
        type: "paragraph",
        text: "Official statistics, governing bodies, or primary sources identified in the Market rules generally govern. Third-party data feeds and live scores are provided for convenience and may lag or contain errors; resolution follows the Market rule’s designated sources, not necessarily on-screen feed timing.",
      },
    ],
  },
  {
    id: "prohibited",
    title: "Prohibited conduct",
    blocks: [
      {
        type: "paragraph",
        text: "You may not, and you may not assist others to:",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "Violate applicable law, regulation, or third-party rights.",
          "Use the Service for fraud, market manipulation, collusion, insider trading based on non-public information obtained improperly, or deceptive practices.",
          "Harass, threaten, abuse, discriminate against, or harm other users or our staff.",
          "Attempt to probe, scan, hack, or bypass security; overload or disrupt systems; or misuse APIs, bots, or scripts except via documented interfaces we authorize.",
          "Scrape, data mine, or extract Content at scale without permission, or misrepresent affiliation with us.",
          "Use the Service where prohibited by sanctions, export controls, or gambling or securities laws applicable to you.",
          "Circumvent geographic blocks, account restrictions, self-exclusion, or responsible-gaming controls.",
        ],
      },
      {
        type: "paragraph",
        text: "We may investigate suspected violations, cooperate with law enforcement, suspend or terminate accounts, reverse or void transactions, and withhold payouts where we reasonably believe required for legal compliance or integrity of Markets.",
      },
    ],
  },
  {
    id: "ip",
    title: "Intellectual property",
    blocks: [
      {
        type: "paragraph",
        text: "We and our licensors own the Service and Content (excluding User Content), including trademarks, logos, and software. Except for the limited license below, no rights are granted.",
      },
      {
        type: "paragraph",
        text: "Subject to these Terms, we grant you a personal, non-exclusive, non-transferable, revocable license to access and use the Service for lawful purposes in accordance with these Terms.",
      },
      {
        type: "paragraph",
        text: "You grant us a worldwide, non-exclusive license to host, use, reproduce, modify, and display User Content as needed to operate, secure, and improve the Service, subject to our Privacy Policy.",
      },
    ],
  },
  {
    id: "third-parties",
    title: "Third-party services & data",
    blocks: [
      {
        type: "paragraph",
        text: "The Service may integrate third-party scores, odds, identity providers, payment processors, analytics, or hosting. Those providers are subject to their own terms and privacy policies. We are not responsible for third-party availability, accuracy, or practices, except where mandatory law provides otherwise.",
      },
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimer of warranties",
    blocks: [
      {
        type: "paragraph",
        text: "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE AND CONTENT ARE PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.",
      },
      {
        type: "paragraph",
        text: "Some jurisdictions do not allow certain disclaimers; in those jurisdictions, disclaimers apply to the fullest extent permitted.",
      },
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    blocks: [
      {
        type: "paragraph",
        text: "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL WE OR OUR AFFILIATES, LICENSORS, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY.",
      },
      {
        type: "paragraph",
        text: "OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE IS LIMITED TO THE GREATER OF (A) ONE HUNDRED U.S. DOLLARS (USD $100) OR (B) THE AMOUNTS YOU PAID US FOR THE SERVICE (EXCLUDING PLAY CREDITS WITH NO REDEMPTION VALUE) IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, IF ANY.",
      },
      {
        type: "paragraph",
        text: "Nothing in these Terms excludes or limits liability where it cannot be excluded or limited under mandatory law (including gross negligence, willful misconduct, or death/personal injury caused by negligence, where applicable).",
      },
    ],
  },
  {
    id: "indemnity",
    title: "Indemnification",
    blocks: [
      {
        type: "paragraph",
        text: "You will defend, indemnify, and hold harmless us and our affiliates, officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys’ fees) arising out of or related to your use of the Service, your User Content, your violation of these Terms, or your violation of applicable law or third-party rights.",
      },
    ],
  },
  {
    id: "termination",
    title: "Suspension & termination",
    blocks: [
      {
        type: "paragraph",
        text: "You may stop using the Service at any time. We may suspend or terminate access for breach of these Terms, risk, legal compliance, or operational reasons. Provisions that by their nature should survive (including intellectual property, disclaimers, limitations, indemnity, governing law, and dispute provisions) survive termination.",
      },
      {
        type: "paragraph",
        text: "Upon termination, your right to access the Service ceases. We may delete or retain data as described in our Privacy Policy and applicable law.",
      },
    ],
  },
  {
    id: "privacy-ref",
    title: "Privacy",
    blocks: [
      {
        type: "paragraph",
        text: "Our collection and use of personal information is described in our Privacy Policy, which is incorporated into these Terms by reference. Please review it to understand your choices and rights.",
      },
    ],
  },
  {
    id: "disputes",
    title: "Dispute resolution; informal resolution",
    blocks: [
      {
        type: "paragraph",
        text: "Before filing a claim, you agree to contact us and attempt to resolve the dispute informally for at least thirty (30) days.",
      },
      {
        type: "paragraph",
        text: "If you are a consumer in the European Union, European Economic Area, United Kingdom, or Switzerland, you may benefit from mandatory consumer protection laws in your country of residence, and you may bring proceedings in the courts of your place of residence where such rights cannot be waived. You may also use the European Commission’s online dispute resolution (ODR) platform where applicable.",
      },
      {
        type: "paragraph",
        text: "If you are not covered by the preceding paragraph, except where prohibited by applicable law, you agree that exclusive jurisdiction and venue for disputes will be as set forth in “Governing law” below, and you waive any objection to venue in those courts.",
      },
      {
        type: "paragraph",
        text: "To the fullest extent permitted by law, you agree that disputes will be brought only in an individual capacity, not as a plaintiff or class member in any class or representative proceeding. If a court finds this class waiver unenforceable, the remainder of these Terms still apply.",
      },
    ],
  },
  {
    id: "governing-law",
    title: "Governing law",
    blocks: [
      {
        type: "paragraph",
        text: "Unless mandatory law requires otherwise, these Terms are governed by the laws of the State of Delaware, United States, without regard to conflict-of-law principles that would require application of another jurisdiction’s laws. Subject to the “Dispute resolution” section, you and we consent to the personal jurisdiction of the state and federal courts located in Delaware for disputes not subject to mandatory consumer venue rules.",
      },
      {
        type: "notice",
        variant: "note",
        text: "Deploying operators outside the United States should have counsel align governing law, venue, and consumer protections with their corporate presence and user base.",
      },
    ],
  },
  {
    id: "general",
    title: "General",
    blocks: [
      {
        type: "paragraph",
        text: "These Terms, together with policies incorporated by reference, constitute the entire agreement between you and us regarding the Service and supersede prior understandings on the same subject.",
      },
      {
        type: "paragraph",
        text: "If any provision is held invalid or unenforceable, the remaining provisions remain in effect. Our failure to enforce a provision is not a waiver. You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition, or sale of assets.",
      },
      {
        type: "paragraph",
        text: "Section headings are for convenience only. The English language version controls if we provide translations.",
      },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    blocks: [
      {
        type: "paragraph",
        text: "Questions about these Terms: contact the operator of your Agora deployment using the support channel they publish. For general product questions, see the FAQ.",
      },
    ],
  },
];
