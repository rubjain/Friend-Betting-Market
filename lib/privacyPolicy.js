/**
 * Privacy Policy — structured copy. Have counsel review for your deployment and jurisdiction.
 */

export const PRIVACY_META = {
  effectiveDate: "May 3, 2026",
  version: "1.0",
  documentTitle: "Privacy Policy",
};

/** @type {{ id: string, title: string, blocks: Record<string, unknown>[] }[]} */
export const PRIVACY_SECTIONS = [
  {
    id: "scope",
    title: "Scope & who this applies to",
    blocks: [
      {
        type: "paragraph",
        text: "This Privacy Policy describes how the operator of this Agora deployment (“we,” “us,” “our”) collects, uses, discloses, and otherwise processes personal information in connection with the Agora service (the “Service”), including our websites and applications. It should be read together with our Terms of Use.",
      },
      {
        type: "notice",
        variant: "important",
        text: "The legal entity responsible for your data (the data “controller” under EU/UK law) is the organization operating this deployment. If that entity’s name and contact details are not shown in the Service, request them from your administrator or support contact before providing sensitive information.",
      },
    ],
  },
  {
    id: "collect",
    title: "Information we collect",
    blocks: [
      {
        type: "subheading",
        text: "You provide",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "Account and profile data: name, username, email address, password (hashed), and settings you choose.",
          "Support and communications: messages you send us, survey responses, and feedback.",
          "Verification: information required for KYC, age checks, or fraud prevention if we offer real-money or regulated features.",
        ],
      },
      {
        type: "subheading",
        text: "Collected automatically",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "Device and log data: IP address, device identifiers, browser type, operating system, rough location derived from IP, and timestamps.",
          "Usage data: pages or screens viewed, features used, markets viewed, in-app events, and performance or error logs.",
          "Cookies and similar technologies, as described in your cookie notice or in-product settings where available.",
        ],
      },
      {
        type: "subheading",
        text: "From others",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "Service providers and analytics partners that help us operate the Service.",
          "Identity, fraud, and sanctions screening vendors where permitted by law.",
          "Public sources or business partners if you connect third-party accounts (subject to your settings and that third party’s terms).",
        ],
      },
    ],
  },
  {
    id: "use",
    title: "How we use information",
    blocks: [
      {
        type: "paragraph",
        text: "We use personal information to:",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "Provide, secure, and improve the Service, including authentication, transactions, leaderboards, and friend features.",
          "Communicate with you about the Service, security, and policy changes; send marketing only where allowed and with your consent or as permitted by law.",
          "Detect, prevent, and investigate fraud, abuse, sanctions violations, and illegal activity.",
          "Comply with legal obligations and enforce our Terms of Use.",
          "Analyze usage in aggregate or de-identified form to improve products.",
        ],
      },
      {
        type: "paragraph",
        text: "We do not sell your personal information as those words are defined under U.S. state privacy laws (such as the California Consumer Privacy Act / CPRA) where applicable; where required we offer opt-outs described below.",
      },
    ],
  },
  {
    id: "legal-bases",
    title: "Legal bases (EEA/UK)",
    blocks: [
      {
        type: "paragraph",
        text: "If EU or UK GDPR applies, we rely on one or more of the following legal bases: performance of a contract with you; legitimate interests that are not overridden by your rights (such as security and product improvement, balanced against your expectations); compliance with legal obligations; and consent where required (for example certain cookies or marketing).",
      },
    ],
  },
  {
    id: "sharing",
    title: "Sharing & disclosure",
    blocks: [
      {
        type: "paragraph",
        text: "We may disclose personal information to:",
      },
      {
        type: "list",
        ordered: false,
        items: [
          "Service providers who process data on our instructions (hosting, email delivery, analytics, customer support).",
          "Professional advisers, auditors, and insurers under confidentiality obligations.",
          "Authorities when required by law, legal process, or to protect rights, safety, and security.",
          "Actual or prospective acquirers in a merger, financing, or sale of assets, subject to confidentiality commitments.",
        ],
      },
      {
        type: "paragraph",
        text: "We require recipients to use appropriate safeguards and process data only as needed for the purposes described.",
      },
    ],
  },
  {
    id: "retention",
    title: "Retention",
    blocks: [
      {
        type: "paragraph",
        text: "We retain personal information for as long as your account is active, as needed to provide the Service, and as required to comply with law, resolve disputes, and enforce agreements. Retention periods vary by data type and jurisdiction; we apply minimization and deletion schedules consistent with business and legal needs.",
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    blocks: [
      {
        type: "paragraph",
        text: "We implement technical and organizational measures designed to protect personal information against unauthorized access, loss, or alteration. No method of transmission or storage is completely secure; we cannot guarantee absolute security.",
      },
    ],
  },
  {
    id: "international",
    title: "International transfers",
    blocks: [
      {
        type: "paragraph",
        text: "If you access the Service from outside the country where we operate, your information may be processed in the United States or other countries that may not provide the same level of protection as your home jurisdiction. Where required, we use appropriate safeguards such as standard contractual clauses approved by the European Commission or equivalent mechanisms.",
      },
    ],
  },
  {
    id: "rights",
    title: "Your rights & choices",
    blocks: [
      {
        type: "paragraph",
        text: "Depending on where you live, you may have rights to access, correct, delete, or export your personal information; object to or restrict certain processing; withdraw consent where processing is consent-based; and lodge a complaint with a supervisory authority.",
      },
      {
        type: "paragraph",
        text: "California residents may have additional rights under the CCPA/CPRA (including knowing categories and specific pieces of personal information, deleting personal information, correcting inaccuracies, and opting out of certain sharing). We will not discriminate against you for exercising these rights.",
      },
      {
        type: "paragraph",
        text: "To exercise rights, use in-product privacy controls where available or contact us using the methods published in the Service. We may verify your request and may need additional information to process it. Authorized agents may submit requests where permitted by law.",
      },
    ],
  },
  {
    id: "children",
    title: "Children",
    blocks: [
      {
        type: "paragraph",
        text: "The Service is not directed to children under 13 (or under 16 where applicable). We do not knowingly collect personal information from children. If you believe we have collected such information, contact us and we will delete it promptly.",
      },
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    blocks: [
      {
        type: "paragraph",
        text: "We may update this Privacy Policy from time to time. We will post the revised policy and update the effective date. Where changes are material and required by law, we will provide additional notice.",
      },
    ],
  },
  {
    id: "contact-privacy",
    title: "Contact (privacy)",
    blocks: [
      {
        type: "paragraph",
        text: "For privacy questions or requests, contact the operator using the support or privacy contact published in this deployment. If none is listed, ask your organization’s administrator for the appropriate privacy contact before submitting sensitive requests.",
      },
    ],
  },
];
