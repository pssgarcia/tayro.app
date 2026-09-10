import { Link } from 'react-router-dom';
import {
  LegalDocumentShell,
  Section,
  SubSection,
  List,
  Callout,
  Placeholder,
  ContactLink,
} from '../../../components/legal/LegalDocument';
import {
  PRIVACY_LABEL_EN,
  PRIVACY_PATH,
  TERMS_VERSION,
  LEGAL_UPDATED_AT_EN,
  LEGAL_CONTACT_EMAIL,
} from '../../../config/legal';

// ─── Terms of Use, versão em inglês ──────────────────────────────────────────
//
// Tradução de cortesia da versão em português, publicada em 2026-09-09. NÃO é
// documento novo: a versão é a mesma (`TERMS_VERSION`), e é isso que mantém o
// `User.acceptedTermsVersion` gravado pelo servidor apontando para um texto
// identificável sem precisar guardar idioma no registro de aceite.
//
// Por isso duas regras, que não são estilo:
//  1. A página DIZ, antes do título, que é tradução e que o texto em português
//     prevalece em caso de divergência. Sem essa frase, alguém que só leu o
//     inglês teria aceitado documento que não leu, que foi exatamente o motivo
//     de os documentos terem ficado de fora do i18n até aqui.
//  2. Mudou o texto em português, muda aqui no MESMO commit, ou as duas
//     versões passam a dizer coisas diferentes sob o mesmo número de versão.
//
// As mesmas negativas do original são obrigatórias aqui e estão travadas por
// teste em inglês (`TermsOfUsePage.spec.tsx`): não processa pagamento, não
// verifica identidade nem titularidade de @, sem integração oficial com
// Instagram/Meta, sem moderação, sem hospedagem de arquivo, sem SLA, não é
// parte da relação, aprovar candidatura não é contrato, a candidatura sem
// login cria conta, a exclusão não é total, idade é declarada.
export default function TermsOfUseEn() {
  return (
    <LegalDocumentShell
      notice={
        <>
          <p>
            <strong className="text-foreground">
              This is a courtesy translation of the Portuguese original.
            </strong>{' '}
            The Portuguese version of these Terms of Use is the binding one, and it is the version
            recorded when you accept these Terms. In case of any divergence between the two texts,
            the Portuguese version prevails.
          </p>
          <p>
            Both versions carry the same version number, {TERMS_VERSION}, and describe the same
            document. The original is on this same page: switch the language at the top to read it.
          </p>
        </>
      }
      updatedLabel={`Version ${TERMS_VERSION} · updated ${LEGAL_UPDATED_AT_EN}`}
      title="Terms of Use"
      intro={
        <>
          <p>
            These Terms of Use govern access to and use of{' '}
            <strong className="text-foreground">TAYRO</strong>, a platform that brings brands and
            creators together so that promotional partnerships become possible.
          </p>
          <p>
            <strong className="text-foreground">Creating an account</strong> and{' '}
            <strong className="text-foreground">
              submitting an application through the public form
            </strong>{' '}
            require express acceptance of these Terms and of the{' '}
            <Link
              to={PRIVACY_PATH}
              className="text-lime underline underline-offset-2 hover:text-foreground"
            >
              {PRIVACY_LABEL_EN}
            </Link>
            , given by ticking the corresponding boxes. Without that acceptance, no account is
            created and no application is sent.
          </p>
          <p>
            The public pages of TAYRO, such as the home page, the campaign showcase and public
            creator profiles, may be browsed without an account.{' '}
            <strong className="text-foreground">
              Simply visiting those pages is not treated as acceptance of these Terms
            </strong>
            , without prejudice to the legal protection of the platform elements described in
            clause 16 and to the prohibitions set out in law.
          </p>
          <p>
            If you do not agree with any part of this document, do not create an account and do not
            submit an application.
          </p>
        </>
      }
      footer={
        <Link
          to={PRIVACY_PATH}
          className="font-mono text-[10px] uppercase tracking-widest text-kinetic-muted transition-colors hover:text-lime"
        >
          {PRIVACY_LABEL_EN}
        </Link>
      }
    >
      <Section id="aceitacao" title="1. Acceptance of these Terms">
        <p>
          Accepting these Terms and the {PRIVACY_LABEL_EN} is a condition for{' '}
          <strong className="text-foreground">creating an account</strong> and for{' '}
          <strong className="text-foreground">
            submitting an application through the public form
          </strong>
          , which is the flow where an account is created without prior registration (clause 3.4).
          Acceptance is given actively, by ticking the corresponding boxes, which are never
          pre-ticked. Browsing the public pages requires no acceptance and is not treated as such.
        </p>
        <p>At the moment of acceptance, the platform records:</p>
        <List
          items={[
            'the version of these Terms of Use in force at that moment',
            `the version of the ${PRIVACY_LABEL_EN} in force at that moment`,
            'the date and time of acceptance',
            'the declaration, made by the user, of being 18 years old or older',
          ]}
        />
        <p>
          The recorded version is set by the platform at the moment of acceptance, and is not
          supplied by the user browser.
        </p>
        <Callout>
          <p>
            Accepting the {PRIVACY_LABEL_EN} means{' '}
            <strong className="text-foreground">
              being aware of and accepting that document
            </strong>
            , as applicable.
          </p>
          <p>
            It does not amount to a single, generic consent to any and all processing of personal
            data. The purposes and the legal bases of each processing activity are described in the{' '}
            {PRIVACY_LABEL_EN} itself, and certain features have their own separate authorisation,
            such as the activation of the public profile by the creator.
          </p>
        </Callout>
        <p>
          Accounts created before September 4, 2026, the date on which this record came into
          existence, have no acceptance record associated with them. That does not prevent these
          Terms from applying to use of the platform from their publication onwards.
        </p>
      </Section>

      <Section id="sobre" title="2. About TAYRO">
        <p>
          TAYRO is a <strong className="text-foreground">technology platform</strong>. Its function
          is to organise, in one place, the information brands and creators use to decide whether
          they want to work together and to follow the progress of that partnership.
        </p>
        <p>Through the platform, it is currently possible for:</p>
        <List
          items={[
            'brands to create, publish, edit and close campaigns',
            'creators to browse open campaigns and submit applications',
            'brands to review applications, with public information from the Instagram profile the creator provided, and to approve or reject each one',
            'creators to record produced content, by means of links, and brands to review those records',
            'brands to record agreed rewards and to report partnership results',
            'creators to keep a profile and a media kit, with the option of making them public',
          ]}
        />
        <Callout>
          <p>
            TAYRO is not an agency, is not a financial intermediary and is not a party to the
            partnership.
          </p>
          <p>
            It does not represent brands or creators, does not negotiate terms on anyone behalf and
            does not guarantee that a partnership will be entered into, performed or paid. Clause 12
            details this point.
          </p>
        </Callout>
        <p>
          The platform is under continuous development. Features may be created, changed, limited or
          discontinued, as set out in clause 14.
        </p>
      </Section>

      <Section id="cadastro" title="3. Registration and account">
        <SubSection title="3.1. Requirements">
          <p>
            TAYRO is intended exclusively for people who are{' '}
            <strong className="text-foreground">18 years old or older</strong>. By creating an
            account, the user declares to be of that age.
          </p>
          <p>
            The platform neither requests nor stores a date of birth, and{' '}
            <strong className="text-foreground">
              performs no documentary or automated age verification
            </strong>
            . What exists is the declaration made by the user, recorded with date and time.
          </p>
          <p>
            If it is established that an account belongs to a person under 18, TAYRO may close it,
            as set out in clause 15.
          </p>
        </SubSection>

        <SubSection title="3.2. Registration information">
          <p>
            The information provided must be true, accurate and kept up to date. The user is
            responsible for the content and the truthfulness of the data provided, including name,
            email address, phone number and social media usernames.
          </p>
          <p>
            TAYRO <strong className="text-foreground">does not verify the identity</strong> of
            creators or brands, does not check documents, does not validate company registration
            numbers and{' '}
            <strong className="text-foreground">
              does not confirm whether the person who provides a social media profile is its holder
            </strong>
            .
          </p>
        </SubSection>

        <SubSection title="3.3. Credentials and account security">
          <p>
            The account is personal and non-transferable. The user is responsible for keeping their
            credentials confidential and for all activity carried out through their account.
          </p>
          <p>
            If unauthorised access is suspected, the user must change the password immediately,
            using the feature available on the platform, and inform TAYRO through the channel in
            clause 22. Changing the password ends the sessions open on the account.
          </p>
        </SubSection>

        <SubSection title="3.4. Applying without logging in, and account creation">
          <p>
            This point deserves particular attention, as it is the only way an account is created
            without prior registration.
          </p>
          <Callout>
            <p>
              The public link of a campaign allows a creator to{' '}
              <strong className="text-foreground">submit an application without being logged in</strong>{' '}
              and without having a previous TAYRO account.
            </p>
            <p>
              When that application is submitted,{' '}
              <strong className="text-foreground">
                a creator account is created with the data provided in the form
              </strong>{' '}
              (name, email address, phone number and Instagram username), or, if an account already
              exists for that email address or that username, the existing account is used.
            </p>
            <p>
              An account created this way starts{' '}
              <strong className="text-foreground">without a password chosen by the user</strong>. An
              email is sent to the address provided, with a link for the person to set their own
              password and start accessing the account. That link has an expiry date.
            </p>
            <p>
              Submitting an application through this flow also requires acceptance of these Terms
              and of the {PRIVACY_LABEL_EN}, and the declaration of legal age, under the same
              conditions as clause 1.
            </p>
          </Callout>
          <p>
            Until the password is set, the account remains in existence and the application remains
            available for review by the brand responsible for the campaign.
          </p>
          <p>
            Anyone who does not want an account to be created should not submit an application
            through that form. Deletion of a creator account may be requested as set out in clause
            15 and in the {PRIVACY_LABEL_EN}.
          </p>
          <p>
            The role of an account cannot be changed. A creator account does not become a brand
            account, and the reverse does not happen either.
          </p>
        </SubSection>
      </Section>

      <Section id="regras-gerais" title="4. General rules of use">
        <p>By using TAYRO, the user undertakes to:</p>
        <List
          items={[
            'use the platform in accordance with these Terms, with applicable law and in good faith',
            'provide true information and keep it up to date',
            'not present themselves as another person, brand or organisation',
            'not use the platform for unlawful, misleading or abusive purposes',
            'be answerable for the content, the links and the information they submit',
            'respect the rights of third parties, including copyright, image rights and trademark rights',
            'not attempt to access areas, accounts or data they are not authorised to access',
          ]}
        />
        <p>
          The user acknowledges that other people use the platform and that information they make
          available in certain features will be shown to the counterparty of the partnership, as
          described in the {PRIVACY_LABEL_EN}.
        </p>
      </Section>

      <Section id="creators" title="5. Rules for creators">
        <p>The creator is responsible for:</p>
        <List
          items={[
            <>
              <strong className="text-foreground">Registration data.</strong> The truthfulness and
              the updating of name, email address, phone number, city, niches, biography and any
              other information provided.
            </>,
            <>
              <strong className="text-foreground">Instagram username.</strong> Providing their own
              profile, one they hold or are authorised to represent. The platform only checks,
              through an external source, whether the username provided appears to exist, and{' '}
              <strong className="text-foreground">
                does not verify whether it belongs to whoever provided it
              </strong>
              . Providing a third party profile is a breach of these Terms.
            </>,
            <>
              <strong className="text-foreground">Application information.</strong> The content of
              the message sent to the brand and the decision to send it, being aware that it will be
              shown to the brand responsible for the campaign.
            </>,
            <>
              <strong className="text-foreground">Recorded content.</strong> The content produced
              and the information recorded on the platform about it, as set out in clause 8.
            </>,
            <>
              <strong className="text-foreground">External links.</strong> The addresses they
              provide, including the destination, the availability and the access permissions of
              those addresses. TAYRO does not control, does not review and is not responsible for
              content hosted on third party services.
            </>,
            <>
              <strong className="text-foreground">Terms agreed with the brand.</strong> Performance
              of the obligations they take on directly with a brand, including deadlines, delivery
              format, exclusivity, advertising and any other conditions agreed between the parties,
              on or off the platform.
            </>,
            <>
              <strong className="text-foreground">Advertising rules.</strong> Compliance with the
              law and the rules applicable to promoting products and services, including the
              identification of advertising content, and with the rules of the platforms where they
              publish.
            </>,
          ]}
        />
        <p>
          The creator acknowledges that the approval of an application does not guarantee the
          receipt of money, products or any other consideration, and that the consideration is an
          obligation of the brand, as set out in clauses 11 and 12.
        </p>
      </Section>

      <Section id="marcas" title="6. Rules for brands">
        <p>The brand is responsible for:</p>
        <List
          items={[
            <>
              <strong className="text-foreground">Campaign information.</strong> Title,
              description, brief, deadlines, number of spots, niches and any other published
              information, which must be true, clear and not misleading.
            </>,
            <>
              <strong className="text-foreground">Terms of the offer.</strong> The offer presented
              to creators, including amount, product, commission percentage, deadline and
              description, and its performance towards the creator whose application is approved.
            </>,
            <>
              <strong className="text-foreground">Information given to creators.</strong> Everything
              it tells creators on or off the platform, including feedback and guidance about the
              content.
            </>,
            <>
              <strong className="text-foreground">Decisions on applications.</strong> Approving or
              rejecting each application is a decision of the brand alone. TAYRO does not decide,
              does not make binding recommendations and does not interfere in that choice.
            </>,
            <>
              <strong className="text-foreground">Recorded rewards.</strong> The truthfulness of
              reward records and of their states, and the actual performance of what was agreed, as
              set out in clause 11.
            </>,
            <>
              <strong className="text-foreground">Reported results.</strong> The truthfulness of the
              numbers and the result information it records, and the decision to authorise their
              display on the public profile of the creator.
            </>,
            <>
              <strong className="text-foreground">Use of creator data.</strong> The processing of
              personal data of creators received through the platform, for its own purposes, in
              compliance with data protection law.
            </>,
          ]}
        />
        <p>
          The brand acknowledges that the Instagram information shown on the platform is obtained
          from an external source, consists of estimates or reproductions of public data, may be out
          of date or unavailable and is{' '}
          <strong className="text-foreground">not audited by TAYRO</strong>, as set out in clause 9.
        </p>
      </Section>

      <Section id="campanhas" title="7. Campaigns and applications">
        <p>The current flow of the platform is as follows:</p>
        <List
          items={[
            'the brand creates a campaign, which starts as a draft, and publishes it whenever it wants',
            'once published, the campaign is shown in the showcase of open campaigns and gets its own public link',
            'the creator views the campaign and submits an application, with an optional message',
            'the brand reviews the application and approves or rejects it',
            'the platform seeks to inform the creator of the decision by email, without the delivery of that message being guaranteed',
            'once the application is approved, the creator can record content by providing the link to the content produced',
            'the brand reviews the recorded content and may approve it, reject it or request changes, with a comment',
            'the brand may record rewards related to the partnership and report the result obtained',
          ]}
        />
        <p>
          Each campaign has a number of spots, which corresponds to the number of applications the
          brand intends to approve. It does not limit how many applications may be received.
        </p>
        <p>
          A creator may submit only one application per campaign. An application withdrawn by the
          creator cannot be submitted again to the same campaign.
        </p>
        <Callout>
          <p>
            The platform has no electronic signature, no formal acceptance of an offer, no
            electronic contract and no record of specific consent per campaign.
          </p>
          <p>
            Approving an application is a{' '}
            <strong className="text-foreground">record of a decision by the brand</strong> inside
            the platform. In itself, it does not constitute a contract between brand and creator,
            nor does it automatically create a contractual obligation by an act of TAYRO.
          </p>
          <p>
            The obligations between brand and creator arise from what the parties agree between
            themselves and from applicable law.
          </p>
        </Callout>
        <p>
          The brand may close a campaign and may delete a campaign that is still a draft. A closed
          campaign stops receiving applications.
        </p>
      </Section>

      <Section id="conteudo" title="8. Content submitted by users">
        <SubSection title="8.1. How content recording works today">
          <Callout>
            <p>
              TAYRO <strong className="text-foreground">does not host content files</strong>. The
              platform has no upload of video, photo or document.
            </p>
            <p>
              The creator provides an <strong className="text-foreground">address (link)</strong>{' '}
              where the content is available, hosted on a third party service of their choosing. The
              platform stores that address, the media type, an optional caption, the review state
              and the comment from the brand.
            </p>
            <p>
              The availability, the permanence, the security and the access control of the content
              depend on the service where it is hosted, and not on TAYRO. If the link is removed,
              expires or has its access restricted, the platform will have no way of showing the
              content.
            </p>
          </Callout>
          <p>
            The creator is responsible for deciding what they make accessible through the address
            they provide, including as regards the access permissions configured on that service.
          </p>
        </SubSection>

        <SubSection title="8.2. Declaration of ownership and rights">
          <p>
            By recording content, providing a link, submitting a caption or publishing any
            information on the platform, the user declares that:
          </p>
          <List
            items={[
              'they hold the necessary rights over that content, or are duly authorised to use it and to make it available for the purposes of the platform',
              'they have obtained the authorisations for image, voice and other personality rights of everyone appearing in the content',
              'the content does not infringe the rights of third parties or applicable law',
            ]}
          />
          <p>
            The user remains the holder of the rights over the content they produce. These Terms do
            not transfer ownership of that content to TAYRO.
          </p>
        </SubSection>

        <SubSection title="8.3. Licence granted to TAYRO">
          <p>
            So that the platform can work, the user grants TAYRO a{' '}
            <strong className="text-foreground">
              free, non-exclusive licence, limited to what is necessary
            </strong>{' '}
            in order to:
          </p>
          <List
            items={[
              'store the information and the references (links) they record',
              'process and organise that information within the features used',
              'show that information to the people who, through the features of the platform, are meant to have access to it, such as the brand responsible for the campaign the creator applied to',
              'show the information the creator chooses to make public, for as long as that option is active',
              'make the technical copies necessary for operating, securing and restoring the service',
            ]}
          />
          <p>
            This licence exists only to enable the features described in these Terms. It does not
            authorise TAYRO to commercialise user content, to license it to third parties for their
            own purposes, or to use it in TAYRO advertising without specific authorisation from the
            user.
          </p>
          <p>
            The licence ends when the content is removed or the account is closed, except for the
            retention situations described in the {PRIVACY_LABEL_EN} and the licence needed for
            technical copies still in existence.
          </p>
        </SubSection>

        <SubSection title="8.4. No moderation">
          <Callout>
            <p>
              TAYRO <strong className="text-foreground">does not carry out prior moderation</strong>
              , curation, auditing or editorial review of the content, the links and the information
              recorded by users, and has no structured reporting channel inside the platform.
            </p>
            <p>
              The content review that exists on the platform is carried out{' '}
              <strong className="text-foreground">by the brand</strong>, within its own partnership,
              and takes effect only for that partnership.
            </p>
          </Callout>
          <p>
            <strong className="text-foreground">
              There is no general obligation of prior monitoring
            </strong>
            . TAYRO may take measures regarding content or information that breaches these Terms or
            applicable law, within the limits of its technical possibilities and of the legal
            obligations imposed on it, including the measures in clause 15.
          </p>
          <p>
            On becoming aware of unlawful or infringing content, the user may inform TAYRO through
            the channel in clause 22. There is, today, no structured reporting channel inside the
            platform, and such communications are handled according to the operational
            possibilities of TAYRO.
          </p>
        </SubSection>
      </Section>

      <Section id="instagram" title="9. Instagram information and third party services">
        <Callout>
          <p>
            TAYRO <strong className="text-foreground">has no official integration</strong> with
            Instagram, with Meta or with any of their companies, and{' '}
            <strong className="text-foreground">is not a partner, affiliate or authorised</strong>{' '}
            by them.
          </p>
          <p>
            The profile information shown on the platform is obtained from an{' '}
            <strong className="text-foreground">unofficial external provider</strong>, based on
            information publicly available on the profile the creator provided.
          </p>
        </Callout>
        <p>Regarding that information, the user acknowledges that:</p>
        <List
          items={[
            'the availability, the completeness, the timeliness and the accuracy depend on the external source and on the profile consulted, and are outside the control of TAYRO',
            'the information may be out of date, incomplete or unavailable, temporarily or permanently',
            'the query may fail, and the platform may show the last information obtained or indicate that the information is not available',
            'the engagement rate shown is an estimate calculated by TAYRO from public likes and comments on the recent posts consulted, and is not an official Instagram metric',
            'the check performed on a username provided only indicates whether it appears to exist in the source consulted, and does not confirm ownership, authenticity or the truthfulness of any information',
            'none of this information is audited, certified or guaranteed by TAYRO',
          ]}
        />
        <p>
          Any indication that an account is verified on a social network comes from the social
          network itself, not from TAYRO.
        </p>
        <p>
          A change in the conditions of access to that information by the social network or by the
          external provider may limit or interrupt the feature, as set out in clause 14.
        </p>
        <p>
          The processing of personal data arising from those queries is described in the{' '}
          {PRIVACY_LABEL_EN}.
        </p>
      </Section>

      <Section id="perfil-publico" title="10. Public creator profile">
        <p>
          The public profile is an optional feature for creators. It{' '}
          <strong className="text-foreground">starts switched off</strong> and only comes into
          existence when the creator switches it on.
        </p>
        <p>
          Once switched on, the profile becomes accessible at a public address, with no login
          required, and starts showing the following information, as far as it has been filled in:
        </p>
        <List
          items={[
            'name and Instagram username',
            'profile picture obtained from Instagram, or the image the creator has provided',
            'biography, city and niches',
            'phone number provided by the creator',
            'follower count and the engagement estimate calculated by TAYRO',
            'recent posts obtained from Instagram',
            'the number of completed partnerships, calculated by the rule stated on the page itself',
            'partnership results, only under the conditions in the next item',
          ]}
        />
        <p>
          A partnership result only appears on the public profile when{' '}
          <strong className="text-foreground">both conditions</strong> are met: the brand that
          reported it has authorised its public display, and the creator has not hidden it. The
          authorisation from the brand starts switched off.
        </p>
        <p>
          The creator can always see, in their own account, the results reported by brands, whether
          or not they are publicly visible.
        </p>
        <p>
          While the public profile is switched off, the public address does not show the profile,
          and the profile and post images associated with the creator are not made available to the
          public.
        </p>
        <p>
          Switching the public profile off does not reach information that has already been viewed,
          copied, indexed by search engines or stored by third parties while the profile was on.
          TAYRO has no control over copies made by third parties.
        </p>
      </Section>

      <Section id="recompensas" title="11. Rewards and payment records">
        <Callout>
          <p>
            TAYRO <strong className="text-foreground">does not process payments</strong>.
          </p>
          <p>
            The platform has no, and does not operate through, payment gateway, instant transfer,
            credit or debit card, bank slip, digital wallet, payment account, escrow, split of funds
            or any form of financial intermediation. No money passes through TAYRO.
          </p>
          <p>
            The rewards feature is an{' '}
            <strong className="text-foreground">informational record</strong>: it stores what the
            brand declares about the agreed consideration and the state that consideration is in,
            according to the brand itself.
          </p>
        </Callout>
        <p>
          The possible states of a reward are set and changed exclusively by the brand. In
          particular:
        </p>
        <List
          items={[
            <>
              The state <strong className="text-foreground">"Issued"</strong>, and any equivalent
              state, means only that{' '}
              <strong className="text-foreground">the brand declared</strong> that state on the
              platform.
            </>,
            <>
              That state <strong className="text-foreground">is not proof</strong> of payment, of
              transfer, of dispatch or of delivery, and is not verified, confirmed or attested by
              TAYRO.
            </>,
            <>
              TAYRO <strong className="text-foreground">does not guarantee</strong> the payment, the
              dispatch, the delivery, the deadline, the amount or the quality of any consideration.
            </>,
          ]}
        />
        <p>
          The same applies to partnership results: the numbers reported are{' '}
          <strong className="text-foreground">declared by the brand</strong>, are neither measured
          nor audited by TAYRO, and are shown together with an indication of who reported them.
        </p>
        <p>
          Tax, fiscal, employment and social security obligations arising from the relationship
          between brand and creator are the responsibility of the parties involved. TAYRO does not
          issue invoices, receipts or tax documents relating to that consideration, and does not
          withhold taxes.
        </p>
      </Section>

      <Section id="relacao" title="12. Relationship between brands and creators">
        <p>
          The partnership is entered into and performed{' '}
          <strong className="text-foreground">directly between the brand and the creator</strong>.
          TAYRO provides the tool that organises that interaction and{' '}
          <strong className="text-foreground">is not a party to that relationship</strong>.
        </p>
        <p>Within the limits allowed by applicable law, TAYRO:</p>
        <List
          items={[
            'does not guarantee payment or any other consideration agreed between the parties',
            'does not guarantee the delivery, the production, the publication or the permanence of any content',
            'does not guarantee the execution of the campaign, compliance with deadlines or the continuity of the partnership',
            'does not supervise the performance of the obligations taken on by the parties',
            'does not mediate, arbitrate or resolve disputes between brand and creator, and has no mediation or dispute channel',
            'does not guarantee results, reach, return, revenue, engagement or any commercial performance',
            'does not guarantee that a campaign will receive applications, nor that an application will be approved',
            'assumes no obligation of result towards either party',
          ]}
        />
        <p>
          Approving an application, recording content, recording a reward and recording a result are{' '}
          <strong className="text-foreground">records</strong> of acts carried out by the users
          themselves on the platform. They do not represent any statement, agreement, guarantee or
          attestation by TAYRO as to their content.
        </p>
        <p>
          Disputes relating to the partnership must be resolved directly between brand and creator,
          through the legal means available. TAYRO may, where required by law or by a decision of a
          competent authority, provide information it holds.
        </p>
      </Section>

      <Section id="condutas-proibidas" title="13. Prohibited conduct">
        <p>The user is prohibited from, among other conduct:</p>
        <List
          items={[
            'providing false, inaccurate or misleading information, including about identity, profile ownership, metrics or consideration',
            'presenting themselves as another person, brand or organisation, or providing a third party social media profile as if it were their own',
            'creating accounts in order to commit fraud, manipulate results, evade limits or circumvent restrictions',
            'using the platform for unlawful purposes, to commit fraud or for any activity prohibited by law',
            'publishing or recording content that is unlawful, discriminatory, violent, sexually explicit involving minors, or that infringes the rights of third parties',
            'sending spam, bulk messages, unsolicited advertising or abusive communications to other users',
            'manipulating metrics, engagement, results or information recorded on the platform',
            'harassing, threatening, offending or embarrassing other users',
            'collecting data of other users by automated means, including scraping, without express authorisation',
            'attempting to access accounts, data, administrative areas or systems without authorisation',
            'exploiting, testing or disclosing vulnerabilities without first informing TAYRO, or overloading, disrupting or compromising the platform and its infrastructure',
            'reverse engineering, decompiling or attempting to extract the source code of the platform, except where legally permitted',
            'reproducing, copying or exploiting the platform, its interface or its elements in order to create a competing product or service',
          ]}
        />
      </Section>

      <Section id="disponibilidade" title="14. Availability and changes to the platform">
        <p>
          TAYRO is provided as it is and{' '}
          <strong className="text-foreground">
            makes no commitment of continuous availability
          </strong>
          . There is no guarantee of uptime, no agreed service level (SLA), no response deadline and
          no support channel with a guaranteed response time.
        </p>
        <p>The platform may become unavailable, in whole or in part, because of:</p>
        <List
          items={[
            'maintenance, updates, fixes or evolution of the service',
            'failure, unavailability or change of third party services the platform depends on, including hosting, database, email delivery and queries for social media information',
            'failure of the connection, the network or the equipment of the user',
            'unforeseeable circumstances, force majeure or events outside the reasonable control of TAYRO',
          ]}
        />
        <p>
          Features may be created, modified, limited, suspended or discontinued at any time. Where a
          change is relevant, TAYRO will seek to communicate it by an appropriate means, such as
          email or a notice on the platform.
        </p>
        <p>
          TAYRO may set technical limits of use, including rate limiting, in order to protect the
          platform and its users.
        </p>
      </Section>

      <Section id="suspensao" title="15. Suspension and closure of an account">
        <SubSection title="15.1. Closure by the user">
          <p>
            The creator may request the deletion of their account directly on the platform, through
            the feature available in the Profile, which requires confirming the password.
          </p>
          <p>
            The brand may request the deletion of the account through the contact channel in clause
            22, while no equivalent feature is available.
          </p>
          <p>
            The effects of deletion on personal data, including what is removed, what is anonymised
            and what may be retained, are described in the {PRIVACY_LABEL_EN}. Deleting the account
            does not automatically remove every record relating to partnerships already carried out.
          </p>
        </SubSection>

        <SubSection title="15.2. Suspension and closure by TAYRO">
          <p>
            TAYRO may suspend access or close the account, in whole or in part, with or without
            prior notice depending on the seriousness and the urgency of the case, when it
            identifies:
          </p>
          <List
            items={[
              'fraud, attempted fraud or relevant evidence of fraud',
              'abusive use of the platform or of its resources',
              'use for unlawful purposes or purposes contrary to the law',
              'breach of these Terms or of applicable law',
              'an attempt to compromise, overload, break into or exploit a vulnerability of the platform',
              'sending of spam, bulk messages or abusive communications',
              'manipulation of metrics, results or recorded information',
              'conduct that harms other users, TAYRO or third parties',
              'false registration information, including as to the declared age',
              'a legal requirement or a decision of a competent authority',
            ]}
          />
          <p>
            Where possible and appropriate to the case, TAYRO may, before closing the account, ask
            for clarification or notify the user so that the situation can be put right.
          </p>
          <p>
            These are powers of TAYRO to protect the platform and its users, and they{' '}
            <strong className="text-foreground">
              create no obligation of monitoring, moderation or supervision
            </strong>{' '}
            of user behaviour, in line with clause 8.4.
          </p>
          <p>
            Closing the account does not remove the responsibilities taken on by the user before
            closure, nor the obligations they have towards the counterparty of a partnership.
          </p>
        </SubSection>
      </Section>

      <Section id="propriedade-intelectual" title="16. Intellectual property">
        <p>
          All proprietary elements of the platform belong to TAYRO, or to whoever has licensed them
          to it, including:
        </p>
        <List
          items={[
            'the source code, the software, the architecture and the technical documentation',
            'the TAYRO name and trademark, its distinctive signs and its logo',
            'the visual identity, the design, the interface, the organisation of the screens and the graphic elements',
            'the texts belonging to the platform, including those on this page',
            'the domain names associated with the service',
            'the databases and structures developed by TAYRO, except for the personal data of data subjects and the content of users',
          ]}
        />
        <p>
          Access to the platform does not transfer any right over those elements to the user.
          Reproducing, distributing, modifying or exploiting them without express written
          authorisation is prohibited.
        </p>
        <Callout>
          <p>
            The content created and recorded by users{' '}
            <strong className="text-foreground">does not belong to TAYRO</strong>.
          </p>
          <p>
            Each user remains the holder of what they produce. TAYRO receives only the limited
            licence in clause 8.3, necessary for the features used to work.
          </p>
        </Callout>
        <p>
          Third party trademarks, logos and names appearing on the platform belong to their
          respective holders, and their display does not indicate any link, sponsorship or approval,
          except where expressly stated.
        </p>
      </Section>

      <Section id="terceiros" title="17. Third party services">
        <p>
          The operation of TAYRO depends on services provided by third parties, among them
          application hosting, database, transactional email delivery, error monitoring and queries
          for public social media information.
        </p>
        <p>
          The unavailability, change, limitation or discontinuation of any of those services may
          affect, temporarily or permanently, features of the platform. TAYRO does not control those
          services and is not answerable for the acts or omissions of their suppliers, within the
          limits allowed by applicable law.
        </p>
        <p>
          The platform may also contain links to third party sites and services, including the
          addresses provided by the users themselves. TAYRO does not control and does not review
          those destinations, and access to them is the responsibility of the user, subject to the
          terms and policies of each third party.
        </p>
        <p>
          The list of suppliers that may process personal data, with the respective purpose, is in
          the {PRIVACY_LABEL_EN}.
        </p>
      </Section>

      <Section id="privacidade" title="18. Privacy and data protection">
        <p>
          The processing of personal data carried out by TAYRO is described in the{' '}
          <Link
            to={PRIVACY_PATH}
            className="text-lime underline underline-offset-2 hover:text-foreground"
          >
            {PRIVACY_LABEL_EN}
          </Link>
          , which forms part of these Terms.
        </p>
        <p>
          The platform provides features relating to the rights of the data subject, including
          exporting the data associated with the account, changing password and email address,
          control over the display of the public profile and, for creators, deletion of the account.
          Other requests may be made through the contact channel in clause 22.
        </p>
        <p>
          By using features that show information of the creator to the brand, and the reverse, the
          user acknowledges that this sharing is necessary for the purpose of the feature and that
          the counterparty may process that data for its own purposes, as set out in the{' '}
          {PRIVACY_LABEL_EN} and in applicable law.
        </p>
      </Section>

      <Section id="responsabilidade" title="19. Limitation of liability">
        <p>
          TAYRO is liable for damage it causes by its own acts, under applicable law, including,
          where applicable, the Brazilian Consumer Protection Code and the Brazilian General Data
          Protection Law. Nothing in these Terms removes rights that the law guarantees as
          non-waivable.
        </p>
        <p>Within the limits allowed by applicable law, TAYRO is not liable for:</p>
        <List
          items={[
            'the failure of a brand or a creator to perform the obligations taken on between them, including payment, dispatch of a product, deadlines and delivery of content',
            'the truthfulness, the accuracy and the lawfulness of the information provided by users, including campaign, offer, application, content, reward and result information',
            'the inaccuracy, the obsolescence or the unavailability of information obtained from external sources, as set out in clause 9',
            'the content, the availability and the security of third party sites and services accessed through links provided by users',
            'damage arising from the unavailability, failure or interruption of third party services the platform depends on',
            'the decision of a brand to approve or reject an application, and the decision of a creator to apply or not to a campaign',
            'commercial results, reach, financial return or the performance of any campaign or partnership',
            'the conduct of other users, on or off the platform',
            'the use of the credentials of a user by a third party, where it results from a failure of the user to keep them confidential',
          ]}
        />
        <p>
          The user is liable for the damage they cause to TAYRO, to other users or to third parties
          as a result of breaching these Terms or applicable law.
        </p>
      </Section>

      <Section id="alteracoes" title="20. Changes to these Terms">
        <p>
          These Terms may be changed to reflect changes in the features of the platform, in the
          services used or in applicable law.
        </p>
        <p>
          Each published version is identified by a version number and a date, stated at the top of
          this page. The version in force is the one published on this page.
        </p>
        <p>
          Where a change is relevant, TAYRO will seek to communicate it by email, by a notice on the
          platform or by another appropriate means, and may request a new acceptance. If the user
          disagrees with the new version, they must stop using the platform and may request the
          closure of the account as set out in clause 15.
        </p>
      </Section>

      <Section id="lei-aplicavel" title="21. Governing law and jurisdiction">
        <p>
          These Terms are governed by Brazilian law. The language of these Terms is Brazilian
          Portuguese, and the Portuguese version prevails over this translation in case of
          divergence.
        </p>
        <p>
          The courts of the district stated below are chosen to settle disputes arising from these
          Terms, without prejudice to the right of a consumer user to bring proceedings in the
          courts of their own domicile, under applicable law.
        </p>
        {/* Mesmo campo pendente do documento em português (cláusula 21), aqui
            em inglês porque é texto que o leitor vê. Preencher os dois. */}
        <Placeholder>
          <p className="font-medium text-foreground">
            [COURT DISTRICT / VENUE, to be filled in before publishing to production]
          </p>
        </Placeholder>
        <p>
          Before going to court, the parties may seek an amicable solution through the contact
          channel in clause 22.
        </p>
      </Section>

      <Section id="contato" title="22. Contact">
        <p>
          For questions, communications, requests or complaints relating to these Terms or to the
          use of the platform, get in touch:
        </p>
        <ContactLink />
        <p>
          The full identification of the person responsible for the platform is in section 1 of the{' '}
          <Link
            to={PRIVACY_PATH}
            className="text-lime underline underline-offset-2 hover:text-foreground"
          >
            {PRIVACY_LABEL_EN}
          </Link>
          .
        </p>
        <Placeholder>
          <p className="font-medium text-foreground">Pedro Soares de Souza Garcia</p>
          <p>CPF: 119.407.186-43</p>
          <p>Email: {LEGAL_CONTACT_EMAIL}</p>
        </Placeholder>
      </Section>
    </LegalDocumentShell>
  );
}
