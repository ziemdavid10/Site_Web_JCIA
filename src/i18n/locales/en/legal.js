/**
 * Legal pages — ENGLISH
 *
 * ⚠️ Drafted on the basis of Cameroon's Law No. 2024/017 of 23 December 2024 on
 *    the protection of personal data and the official JCIA documents. Must be
 *    reviewed and approved by IAC – CAIPI's legal counsel before going live.
 *    The French version prevails in the event of discrepancy.
 */
export default {
  // ===========================================================================
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy policy',
    intro:
      'IAC – CAIPI takes the protection of your personal data very seriously. This policy explains what data we collect through the JCIA 2027 website, why, how long we keep it and how to exercise your rights.',
    updated: '22 September 2026',
    sections: [
      {
        id: 'responsable',
        title: '1. Data controller',
        blocks: [
          'The data controller is **Intelligence Artificielle Cameroun (IAC) – Cameroon Artificial Intelligence Policy Institute (CAIPI)**, a non-profit association (registration receipt No. 00001626/RDA/JO6/SAAJP/BAPP of 6 October 2023), headquartered at Route de l’aéroport, Cami-Toyota roundabout, Coron, Dangote Building, 2nd floor, Yaoundé, Cameroon.',
          'Contact: **contact@jciacm.com** or **jcia@iacameroun.com** — Tel.: (+237) 699 089 937.',
        ],
      },
      {
        id: 'cadre',
        title: '2. Legal framework',
        blocks: [
          'Processing is carried out in accordance with **Law No. 2024/017 of 23 December 2024 on the protection of personal data in Cameroon**, Law No. 2010/012 of 21 December 2010 on cybersecurity and cybercrime and, where applicable, the regulations applying to participants living abroad.',
        ],
      },
      {
        id: 'donnees',
        title: '3. Data we collect',
        blocks: [
          'We only collect the data we need:',
          {
            list: [
              '**Ticketing**: full name, e-mail address, phone, organisation or institution (optional), names of other attendees on the same order, ticket type and quantity.',
              '**Payment**: paid tickets are bought and paid for on the TIKORA platform (MTN Mobile Money or Orange Money), which processes the payment under its own terms. To send you the link to the attendee form and, at your request, link your ticket to our website (“I’ll be there” visual, photo, attendee list), our server receives from TIKORA the order number, name, e-mail address and amount of your purchase. We **never** collect your Mobile Money PIN.',
              '**Attendee photo (optional)**: the photo you add after registering, cropped and stripped of its metadata (including GPS location). It illustrates your “I’ll be there” visual and only appears in the public attendee list **if you agreed to be listed**. You can remove it at any time.',
              '**Exchanges with the secretariat**: information you send us by e-mail or phone (stand booking, partnership, press accreditation, speaker proposal…).',
              '**CAIA 2027 applications**: submitted on the dedicated platform (awards.jcia.cm) and governed by the Terms of Reference of the call for applications.',
              '**Listing in the National Directory of AI Stakeholders**: only with your explicit consent.',
              '**Technical data**: IP address and connection logs kept by our host for security purposes; preferences (language, theme, cookie choices) stored on your own device.',
            ],
          },
        ],
      },
      {
        id: 'finalites',
        title: '4. Purposes and legal bases',
        blocks: [
          {
            table: {
              head: ['Purpose', 'Legal basis'],
              rows: [
                ['Selling and issuing tickets, managing event access', 'Performance of a contract (ticket purchase)'],
                ['Collecting payments (Mobile Money, bank card) and keeping accounts', 'Performance of a contract / legal obligations'],
                ['Informing you about the JCIA 2027 programme and logistics', 'Your consent / legitimate interest of the organiser'],
                ['Answering your requests (stands, partnerships, press)', 'Pre-contractual measures'],
                ['Keeping the site secure and preventing fraud', 'Legitimate interest / legal obligations'],
                ['Showing your name and, if you add one, your photo in the public attendee list', 'Explicit consent'],
                ['Publishing your profile in the National Directory', 'Explicit consent'],
                ['Measuring site audience (if enabled)', 'Consent'],
              ],
            },
          },
          'Your data is **never sold** and is not used by third parties for marketing purposes.',
        ],
      },
      {
        id: 'destinataires',
        title: '5. Recipients',
        blocks: [
          'Your data is only accessible to authorised members of the JCIA 2027 Organising Committee. It may be shared with:',
          {
            list: [
              'our technical service providers (hosting, e-mail, ticketing, matchmaking app), bound by confidentiality and acting on our instructions;',
              'payment providers (MTN Mobile Money, Orange Money, the Visa and Mastercard networks) or their licensed aggregator, solely to process the transaction;',
              'event partners, **only with your prior consent** (for example to arrange a B2B meeting);',
              'the competent authorities where required by law.',
            ],
          },
        ],
      },
      {
        id: 'transferts',
        title: '6. Transfers outside Cameroon',
        blocks: [
          'Some providers (hosting, e-mail) may be located outside Cameroon. In that case, we ensure these transfers are covered by appropriate safeguards, in accordance with Law No. 2024/017.',
        ],
      },
      {
        id: 'conservation',
        title: '7. Retention periods',
        blocks: [
          {
            list: [
              'Ticketing data: up to 12 months after JCIA 2027 closes, then deleted or anonymised.',
              'Transaction data: the legal retention period for accounting records.',
              'Exchanges with the secretariat: 3 years from the last contact.',
              'Technical logs: 6 months maximum.',
              'Cookie choices: 6 months, after which we ask for your consent again.',
              'National Directory: until you withdraw your consent.',
              'Attendee photos: until you remove them, and at the latest together with ticketing data.',
            ],
          },
        ],
      },
      {
        id: 'droits',
        title: '8. Your rights',
        blocks: [
          'Under the applicable regulations, you have the right to **access**, **rectify**, **erase** and **object** to the processing of your data, to **restrict** processing and to **withdraw your consent** at any time.',
          'To exercise these rights, write to **contact@jciacm.com** or **jcia@iacameroun.com** describing your request. Proof of identity may be requested in case of reasonable doubt. We will reply within one month.',
          'If you believe your rights have not been respected, you may lodge a complaint with the competent personal data protection authority in Cameroon.',
        ],
      },
      {
        id: 'securite',
        title: '9. Security',
        blocks: [
          'We implement appropriate technical and organisational measures: encrypted connection (HTTPS), restricted access to data, data minimisation and awareness training for the organising team.',
        ],
      },
      {
        id: 'mineurs',
        title: '10. Minors',
        blocks: [
          'Online ticketing is intended for adults. Minors wishing to attend must have the consent of, and be accompanied by, their legal guardian. CAIA 2027 is open only to applicants aged 18 or over.',
        ],
      },
      {
        id: 'cookies',
        title: '11. Cookies',
        blocks: ['Our use of cookies and trackers is described in our [cookie policy](/cookies).'],
      },
      {
        id: 'modifications',
        title: '12. Changes',
        blocks: [
          'This policy may be updated, in particular to reflect legal changes or changes to the event. The date of the last update appears at the top of the page.',
        ],
      },
    ],
  },

  // ===========================================================================
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of use',
    intro:
      'These terms govern access to and use of the official website of the Cameroon Artificial Intelligence Days (JCIA 2027). By browsing the site, you accept them in full.',
    updated: '22 September 2026',
    sections: [
      {
        id: 'editeur',
        title: '1. Publisher',
        blocks: [
          'The site is published by **Intelligence Artificielle Cameroun (IAC) – Cameroon Artificial Intelligence Policy Institute (CAIPI)**, a non-profit association (registration receipt No. 00001626/RDA/JO6/SAAJP/BAPP of 6 October 2023).',
          {
            list: [
              'Head office: Route de l’aéroport, Cami-Toyota roundabout, Coron, Dangote Building, 2nd floor, Yaoundé, Cameroon',
              'Phone: (+237) 699 089 937 / 677 238 022',
              'E-mail: contact@jciacm.com — jcia@iacameroun.com',
              'Publication director: the President of IAC – CAIPI',
              'Host: [To be completed: company name, address and phone number of the hosting provider]',
            ],
          },
        ],
      },
      {
        id: 'objet',
        title: '2. Purpose of the site',
        blocks: [
          'The site presents JCIA 2027 (programme, National 100% AI Expo, Cameroon AI Awards, National Directory, partners) and allows visitors to pre-register for the event. Information is provided for guidance only.',
        ],
      },
      {
        id: 'acces',
        title: '3. Access to the site',
        blocks: [
          'The site is available free of charge, 24/7, except during maintenance or in cases of force majeure. Internet connection costs are borne by the user. The publisher cannot be held liable for temporary unavailability of the site.',
        ],
      },
      {
        id: 'inscription',
        title: '4. Ticketing and attendance',
        blocks: [
          {
            list: [
              'Tickets are sold in CFA francs (XAF), all taxes included. The free ticket is booked on this website. Paid tickets are sold and paid for on the TIKORA platform (MTN Mobile Money or Orange Money), whose terms apply to payment and ticket issuing; a TIKORA service fee may be added to the ticket price. The order is confirmed once the payment is approved.',
              'The “Online” ticket gives access to the live stream and to session replays for 30 days; it does not give access to the Hilton Hotel.',
              'Each ticket is sold within a quota published on the Tickets page. Once the quota is reached, the ticket is marked “sold out”.',
              // Free option disabled: 'The “Online” ticket is free.' — see src/data/config.js
              'The “Student” ticket requires a valid student card at the entrance.',
              'Unless the event is cancelled by the organiser, tickets are neither exchanged nor refunded; they may be transferred to another person upon written request to the secretariat.',
              'The “I’ll be there” visual is offered to every holder of a confirmed ticket, free or paid. Users guarantee they are the person in the photo or have their consent, and hold the rights to the photo used; the organiser may remove any inappropriate photo from the public attendee list.',
              'As places are limited, the organiser reserves the right to close registrations or decline a request, in particular if the information provided is inaccurate.',
              'Access to the Hilton Hotel is subject to the security rules of the venue and the organiser. Badges are personal.',
              'The Cameroon AI Awards gala evening is **by invitation only**.',
              'Participants may be photographed or filmed in public areas of the event for communication purposes; anyone who does not wish to be may inform the reception desk.',
            ],
          },
        ],
      },
      {
        id: 'caia',
        title: '5. Cameroon AI Awards (CAIA 2027)',
        blocks: [
          'Participation in the competition is governed exclusively by the [Terms of Reference of the call for applications](/documents/TDR-CAIA-2027.pdf), which prevail over these terms for all matters relating to the competition.',
        ],
      },
      {
        id: 'propriete',
        title: '6. Intellectual property',
        blocks: [
          'The “JCIA” brand and logo, the mascot, texts, visuals, brand guidelines and documents on the site are the property of IAC – CAIPI or their respective authors. Any reproduction or reuse without prior written permission is prohibited.',
          'Some African-inspired illustrations are used under a Freepik Premium licence; they may not be extracted or reused outside the site.',
          'Partner names and logos remain the property of their owners.',
        ],
      },
      {
        id: 'comportement',
        title: '7. User commitments',
        blocks: [
          'Users agree to provide accurate information, not to disrupt the operation of the site (intrusion attempts, automated submissions, malicious content) and to comply with applicable law, in particular Law No. 2010/012 on cybersecurity and cybercrime.',
        ],
      },
      {
        id: 'responsabilite',
        title: '8. Liability',
        blocks: [
          'The programme, speakers and schedule are subject to change. The publisher strives to ensure the accuracy of published information but cannot guarantee the absence of errors or omissions.',
        ],
      },
      {
        id: 'liens',
        title: '9. External links',
        blocks: [
          'The site contains links to third-party sites (application platform, partners, social networks). The publisher has no control over their content and accepts no liability for them.',
        ],
      },
      {
        id: 'donnees',
        title: '10. Personal data and cookies',
        blocks: ['See the [privacy policy](/confidentialite) and the [cookie policy](/cookies).'],
      },
      {
        id: 'droit',
        title: '11. Governing law',
        blocks: [
          'These terms are governed by Cameroonian law. Failing an amicable settlement, any dispute shall fall within the jurisdiction of the courts of Yaoundé. The French version prevails in the event of discrepancy.',
        ],
      },
    ],
  },

  // ===========================================================================
  cookies: {
    eyebrow: 'Legal',
    title: 'Cookie policy',
    intro:
      'This page explains which cookies and trackers are used on the JCIA 2027 website, for what purpose, and how you can manage your choices at any time.',
    updated: '22 September 2026',
    manage: 'Change my preferences',
    sections: [
      {
        id: 'definition',
        title: '1. What is a cookie?',
        blocks: [
          'A cookie (or tracker) is a small file or piece of information stored on your device when you visit a website. The JCIA website mainly uses your browser’s **local storage** (localStorage), which works in a similar way.',
        ],
      },
      {
        id: 'liste',
        title: '2. Trackers we use',
        blocks: [
          {
            table: {
              head: ['Name', 'Purpose', 'Category', 'Duration'],
              rows: [
                ['jcia-lang', 'Remember your chosen language (French / English)', 'Strictly necessary', 'Until deleted'],
                ['jcia-theme', 'Remember your chosen theme (light / dark)', 'Strictly necessary', 'Until deleted'],
                ['jcia-consent', 'Remember your cookie choices', 'Strictly necessary', '6 months'],
                ['jcia-orders', 'Keep your tickets on this device (confirmation, visual)', 'Strictly necessary', 'Until deleted'],
                ['jcia-photos', 'Show your attendee photos on this device (profile, visual)', 'Strictly necessary', 'Until deleted'],
                ['OpenStreetMap', 'Display the interactive venue map', 'Third-party content', 'Per OpenStreetMap’s policy'],
                ['Audience measurement', 'Anonymous statistics (not enabled at this time)', 'Audience measurement', '13 months maximum'],
              ],
            },
          },
          'No advertising cookies are used on this site.',
        ],
      },
      {
        id: 'consentement',
        title: '3. Your consent',
        blocks: [
          'On your first visit, a banner lets you accept, reject or customise non-essential trackers. Rejecting is as easy as accepting and does not prevent you from using the site.',
          'Your choice is kept for 6 months. You can change it at any time via the **“Manage cookies”** link at the bottom of every page or the button below.',
        ],
      },
      {
        id: 'navigateur',
        title: '4. Browser settings',
        blocks: [
          'You can also delete or block cookies and local storage in your browser settings (Chrome, Firefox, Safari, Edge…). Some preferences (language, theme) will then no longer be remembered.',
        ],
      },
      {
        id: 'contact',
        title: '5. Contact',
        blocks: ['For any question: **contact@jciacm.com**. See also our [privacy policy](/confidentialite).'],
      },
    ],
  },
}
