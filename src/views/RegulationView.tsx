import { useState } from 'react'
import { SiteBrand } from '../components/SiteBrand'
import { StageNav } from '../components/StageNav'
import type { AppStage } from '../types/round'

interface RegulationViewProps {
  activeStage: AppStage
  onNavigateStage: (stage: AppStage) => void
}

type RegSectionId =
  | 'part-1'
  | 'part-2'
  | 'part-3'
  | 'part-4'
  | 'part-5'
  | 'definitions'
  | 'schedule-a'

const SECTIONS: { id: RegSectionId; label: string; part: string }[] = [
  { id: 'part-1', label: 'Scope and application', part: 'Part 1' },
  { id: 'part-2', label: 'Licensing of commercial operators', part: 'Part 2' },
  { id: 'part-3', label: 'Vehicle integration and haul', part: 'Part 3' },
  { id: 'part-4', label: 'Pre-liftoff GO poll', part: 'Part 4' },
  { id: 'part-5', label: 'Record-keeping and audit', part: 'Part 5' },
  { id: 'definitions', label: 'Definitions', part: 'Sch. 1' },
  { id: 'schedule-a', label: 'Fee schedule', part: 'Sch. A' },
]

/**
 * Fictional government regulation library (National Space Launch Authority).
 * Mount-only-while-active — same pattern as CustomerPortalView / HomeView.
 * Content is static statute-style text for the Lean learning narrative;
 * weather and range GO calls are buried as optional for licensed commercial
 * launches (Capcom is not).
 */
export function RegulationView({
  activeStage,
  onNavigateStage,
}: RegulationViewProps) {
  const [activeSection, setActiveSection] = useState<RegSectionId>('part-4')

  return (
    <div className="app-shell">
      <header className="top-bar top-bar--round-done">
        <SiteBrand subtitle="Space Launch Regulation" />
      </header>
      <StageNav activeStage={activeStage} onNavigate={onNavigateStage} />
      <main className="app-main">
        <section
          className="view-panel regulation-panel"
          aria-labelledby="regulation-heading"
        >
          <header className="view-panel__header sim-header">
            <div>
              <h2 id="regulation-heading">Regulation library</h2>
              <p className="view-panel__lede">
                Official reference materials for commercial space launch
                operations. External to Orb-it systems — for compliance
                review only.
              </p>
            </div>
          </header>

          <div className="view-panel__body redesign-body">
            <div className="regulation-site">
              {/* Agency masthead */}
              <header className="regulation-masthead">
                <div className="regulation-masthead__crest" aria-hidden="true">
                  <svg viewBox="0 0 64 64" className="regulation-crest">
                    <circle
                      cx="32"
                      cy="32"
                      r="30"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeDasharray="3 2"
                    />
                    <ellipse
                      cx="32"
                      cy="32"
                      rx="28"
                      ry="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M32 8 L36 28 L32 56 L28 28 Z"
                      fill="currentColor"
                      opacity="0.85"
                    />
                    <circle cx="32" cy="20" r="3" fill="currentColor" />
                  </svg>
                </div>
                <div className="regulation-masthead__text">
                  <p className="regulation-masthead__agency">
                    National Space Launch Authority
                  </p>
                  <p className="regulation-masthead__office">
                    Office of Commercial Launch Compliance
                  </p>
                  <p className="regulation-masthead__doc">
                    NSLA Code · Title 14 · Subchapter C — Commercial Orbital
                    Launch Operations
                  </p>
                </div>
                <div className="regulation-masthead__meta">
                  <span className="regulation-badge">Official</span>
                  <span className="regulation-badge regulation-badge--muted">
                    Public
                  </span>
                </div>
              </header>

              <nav className="regulation-breadcrumb" aria-label="Breadcrumb">
                <span>NSLA.gov</span>
                <span aria-hidden="true">›</span>
                <span>Regulations</span>
                <span aria-hidden="true">›</span>
                <span>Title 14</span>
                <span aria-hidden="true">›</span>
                <strong>Subchapter C · Parts 400–440</strong>
              </nav>

              <div className="regulation-doc-meta">
                <div>
                  <span className="regulation-doc-meta__label">Instrument</span>
                  <span>
                    Commercial Orbital Launch Operations Regulations (COLOR),
                    2024 Consolidation
                  </span>
                </div>
                <div>
                  <span className="regulation-doc-meta__label">
                    Effective date
                  </span>
                  <span>1 October 2024</span>
                </div>
                <div>
                  <span className="regulation-doc-meta__label">Last amended</span>
                  <span>Amendment 12 · 14 March 2025</span>
                </div>
                <div>
                  <span className="regulation-doc-meta__label">Citation</span>
                  <span>NSLA COLOR §§ 400–440</span>
                </div>
              </div>

              <div className="regulation-layout">
                <nav
                  className="regulation-toc"
                  aria-label="Regulation table of contents"
                >
                  <p className="regulation-toc__title">Contents</p>
                  <ul className="regulation-toc__list">
                    {SECTIONS.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className={`regulation-toc__link${
                            activeSection === s.id
                              ? ' regulation-toc__link--active'
                              : ''
                          }`}
                          onClick={() => setActiveSection(s.id)}
                          aria-current={
                            activeSection === s.id ? 'true' : undefined
                          }
                        >
                          <span className="regulation-toc__part">{s.part}</span>
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="regulation-toc__note">
                    <p>
                      Unofficial HTML rendering of the consolidated Code.
                      Where this display conflicts with the signed PDF on the
                      NSLA Register, the Register prevails.
                    </p>
                  </div>
                </nav>

                <article
                  className="regulation-content"
                  aria-live="polite"
                >
                  {activeSection === 'part-1' && <Part1 />}
                  {activeSection === 'part-2' && <Part2 />}
                  {activeSection === 'part-3' && <Part3 />}
                  {activeSection === 'part-4' && <Part4 />}
                  {activeSection === 'part-5' && <Part5 />}
                  {activeSection === 'definitions' && <Definitions />}
                  {activeSection === 'schedule-a' && <ScheduleA />}
                </article>
              </div>

              <footer className="regulation-footer">
                <div className="regulation-footer__cols">
                  <div>
                    <p className="regulation-footer__heading">
                      National Space Launch Authority
                    </p>
                    <p>
                      Office of Commercial Launch Compliance
                      <br />
                      1400 Meridian Plaza, Suite 400
                      <br />
                      Capital District · DC 20001
                    </p>
                  </div>
                  <div>
                    <p className="regulation-footer__heading">Contact</p>
                    <p>
                      Compliance desk: +1 (202) 555-0140
                      <br />
                      Licensing: licensing@nsla.example.gov
                      <br />
                      Public register: register@nsla.example.gov
                    </p>
                  </div>
                  <div>
                    <p className="regulation-footer__heading">Notices</p>
                    <p>
                      This site is a training facsimile for process-excellence
                      exercises and does not constitute legal advice. Fictional
                      instrument; not an official government publication.
                    </p>
                  </div>
                </div>
                <p className="regulation-footer__copy">
                  © 2025 National Space Launch Authority · COLOR 2024
                  Consolidation · Document ID NSLA-COLOR-C-2024-12
                </p>
              </footer>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function SectionHeader({
  part,
  title,
  cite,
}: {
  part: string
  title: string
  cite: string
}) {
  return (
    <header className="regulation-section-head">
      <p className="regulation-section-head__part">{part}</p>
      <h3 className="regulation-section-head__title">{title}</h3>
      <p className="regulation-section-head__cite">{cite}</p>
    </header>
  )
}

function Part1() {
  return (
    <div className="regulation-section">
      <SectionHeader
        part="Part 1"
        title="Scope and application"
        cite="COLOR § 400 — § 405"
      />
      <div className="regulation-callout">
        <p className="regulation-callout__label">Application note</p>
        <p>
          Parts 1–5 apply to commercial orbital launch operators holding a
          current NSLA Type-C licence, including constellation insertion
          services conducted from licensed continental ranges.
        </p>
      </div>
      <h4>§ 400. Purpose</h4>
      <p>
        These Regulations establish minimum safety, operational, and
        record-keeping requirements for the conduct of commercial orbital
        launch activities under the National Space Launch Act. Nothing in
        this Subchapter relieves an operator of duties under applicable
        environmental, aviation, or export-control law.
      </p>
      <h4>§ 401. Persons subject</h4>
      <p>
        (a) Any person who conducts, or offers to conduct, a commercial
        orbital launch from a site within the territorial jurisdiction of the
        Authority.
      </p>
      <p>
        (b) Contractors and subcontractors performing launch-critical work on
        behalf of a licensed operator, to the extent identified in the
        operator&apos;s safety case.
      </p>
      <h4>§ 402. Relationship to other instruments</h4>
      <p>
        Where a term is defined in Schedule 1, that definition applies
        throughout this Subchapter unless a Part expressly provides
        otherwise. Cross-references to &quot;GO poll&quot; mean the
        pre-liftoff readiness sequence described in Part 4.
      </p>
      <h4>§ 403. Exemptions</h4>
      <p>
        The Administrator may grant a written exemption from a provision of
        this Subchapter only where (i) an equivalent level of public safety is
        demonstrated, and (ii) the exemption is published on the NSLA Register
        within 30 days of grant.
      </p>
      <ol className="regulation-footnotes">
        <li>
          See also NSLA Policy Letter PL-C-07 (commercial constellation
          cadence and range coordination).
        </li>
      </ol>
    </div>
  )
}

function Part2() {
  return (
    <div className="regulation-section">
      <SectionHeader
        part="Part 2"
        title="Licensing of commercial operators"
        cite="COLOR § 410 — § 418"
      />
      <h4>§ 410. Licence classes</h4>
      <p>
        (a) <strong>Type-C (Commercial Orbital)</strong> — authorises
        repeated orbital launches of vehicles of a declared family from one
        or more named sites, subject to the safety case and maximum annual
        cadence in the licence schedule.
      </p>
      <p>
        (b) <strong>Type-E (Experimental)</strong> — single-mission or
        limited series; not used for revenue constellation services.
      </p>
      <h4>§ 412. Application contents</h4>
      <p>An application for a Type-C licence must include:</p>
      <ol className="regulation-ol">
        <li>Operator identity, responsible officers, and insurance cover;</li>
        <li>
          Vehicle family description, propellant types, and maximum payload
          mass to the declared insertion regime;
        </li>
        <li>
          Site description, including assembly, haul corridors, and pad
          infrastructure;
        </li>
        <li>
          Safety case addressing public risk, flight termination philosophy,
          and ground operations;
        </li>
        <li>
          Proposed pre-liftoff readiness process (see Part 4), including the
          operator&apos;s designated Capcom and Guidance leads.
        </li>
      </ol>
      <h4>§ 415. Conditions of licence</h4>
      <p>
        A Type-C licence is subject to continuous compliance with Parts 3–5.
        Material changes to the haul path, pad interfaces, or GO-poll
        composition must be notified to the Authority not less than 14 days
        before first use, except where Part 4 permits operational discretion
        within an approved framework.
      </p>
      <div className="regulation-table-wrap">
        <table className="regulation-table">
          <caption>Table 2-1 — Licence review intervals</caption>
          <thead>
            <tr>
              <th>Licence class</th>
              <th>Initial term</th>
              <th>Periodic review</th>
              <th>Max. launches / year (default)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Type-C</td>
              <td>5 years</td>
              <td>Biennial</td>
              <td>As schedule</td>
            </tr>
            <tr>
              <td>Type-E</td>
              <td>24 months</td>
              <td>Per mission</td>
              <td>Per schedule</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Part3() {
  return (
    <div className="regulation-section">
      <SectionHeader
        part="Part 3"
        title="Vehicle integration and ground transfer"
        cite="COLOR § 420 — § 428"
      />
      <h4>§ 420. Assembly and integration</h4>
      <p>
        (a) Final vehicle stacking and payload integration shall be performed
        in a controlled facility identified in the safety case.
      </p>
      <p>
        (b) Station order, access-control codes, and transfer automation (if
        any) are matters for the operator&apos;s process design, provided that
        configuration control is maintained and each critical interface is
        verified before the vehicle leaves the assembly facility.
      </p>
      <h4>§ 422. Ground transfer (haul)</h4>
      <p>
        (a) Transfer of a stacked vehicle from assembly to the launch pad
        shall follow a path that remains on surfaces designated for that
        purpose in the site plan.
      </p>
      <p>
        (b) Operators shall implement measures to prevent unplanned departure
        from the designated corridor. Each ground-transfer incident that
        results in vehicle damage or an emergency stop shall be logged as a
        process defect for internal quality purposes and reported under Part 5
        where thresholds in § 432 are met.
      </p>
      <h4>§ 425. Pad seating and umbilicals</h4>
      <p>
        Before commencement of the pre-liftoff GO poll under Part 4, the
        vehicle shall be confirmed seated on the pad structure, strongback or
        equivalent hold-down engaged as designed, and umbilicals in the state
        required by the countdown procedure.
      </p>
      <div className="regulation-callout regulation-callout--info">
        <p className="regulation-callout__label">Cross-reference</p>
        <p>
          Launch-prep technical means (pump rates, power sequencing, payload
          handling, strongback geometry) are not prescribed by this Part.
          Operators may adopt any combination of means that meets the
          interface and verification duties above.
        </p>
      </div>
    </div>
  )
}

function Part4() {
  return (
    <div className="regulation-section">
      <SectionHeader
        part="Part 4"
        title="Pre-liftoff GO poll and countdown readiness"
        cite="COLOR § 430 — § 438"
      />

      <div className="regulation-callout">
        <p className="regulation-callout__label">Part overview</p>
        <p>
          This Part sets the minimum composition of the pre-liftoff readiness
          poll (&quot;GO poll&quot;) for Type-C commercial orbital launches.
          Operators remain free to add stations; the Authority regulates only
          those elements listed as required.
        </p>
      </div>

      <h4>§ 430. General duty</h4>
      <p>
        (a) No licensed commercial orbital launch shall proceed to irreversible
        liftoff commitment unless the operator has completed a pre-liftoff GO
        poll consistent with this Part and the operator&apos;s approved countdown
        procedure.
      </p>
      <p>
        (b) The GO poll shall be conducted from a designated control position
        with a recorded voice or digital log retained for not less than 36
        months (§ 434).
      </p>

      <h4>§ 431. Required GO stations — commercial Type-C</h4>
      <p>
        (a) Subject to § 432 and § 433, the GO poll for a Type-C licensed
        commercial orbital launch shall include affirmative readiness
        declarations from each of the following stations, in an order
        determined by the operator&apos;s procedure:
      </p>
      <ol className="regulation-ol">
        <li>
          <strong>Guidance</strong> — guidance, navigation, and control
          software load and inertial reference state;
        </li>
        <li>
          <strong>Capcom</strong> — capsule (or mission) communications lead,
          confirming voice loop integrity with the vehicle and range
          coordination net as applicable;
        </li>
        <li>
          <strong>Propulsion</strong> — propulsion systems, propellant
          conditioning, and engine controller readiness;
        </li>
        <li>
          <strong>Avionics</strong> — flight computers, telemetry, and
          flight-termination interfaces (where fitted).
        </li>
      </ol>
      <p>
        (b) The stations in subsection (a) are mandatory for every Type-C
        commercial orbital attempt. An operator may not omit Capcom, Guidance,
        Propulsion, or Avionics from the GO poll on the basis of schedule
        pressure, automation upgrades, or internal process redesign.
      </p>
      <p>
        (c) Operators may insert additional stations (including, without
        limitation, payload, ground systems, or customer representatives)
        between or after the stations in subsection (a).
      </p>

      <h4>§ 432. Optional stations for licensed commercial launches</h4>
      <p>
        (a) Without limiting the operator&apos;s ability to adopt a more
        conservative procedure, the following stations are{' '}
        <em>not prescribed</em> as mandatory elements of the GO poll for a
        Type-C licensed commercial orbital launch conducted under this
        Subchapter:
      </p>
      <ol className="regulation-ol">
        <li>
          <strong>Weather</strong> — meteorological and upper-winds checks,
          and any associated Weather GO call, are optional for these licensed
          commercial launches. An operator may include a Weather station where
          the safety case or customer contract so requires, but omission of
          Weather from the GO poll does not, by itself, constitute a breach of
          this Part;
        </li>
        <li>
          <strong>Range / Range Safety</strong> — range safety officer checks
          and any associated Range Safety GO call are optional for these
          licensed commercial launches. Flight-termination hardware and
          software, where required by the safety case, remain subject to
          Avionics verification under § 431(a)(4); the separate Range Safety
          GO station itself is not mandated for Type-C commercial operations
          under this consolidation.
        </li>
      </ol>
      <p>
        (b) For the avoidance of doubt, subsection (a) does not apply to
        Capcom or to any other station listed in § 431(a). Capcom remains a
        required GO station for all Type-C commercial orbital launches.
      </p>
      <p>
        (c) Experimental (Type-E) launches and government-sponsored missions
        may be subject to additional range or weather directives issued under
        separate instruments; those directives are outside the scope of this
        optional-station rule.
      </p>

      <h4>§ 433. Sequence integrity and realignment</h4>
      <p>
        (a) The operator shall ensure that each required station has a clear
        means of declaring GO or HOLD. Misaligned or ambiguous control layouts
        that create unreasonable risk of a missed HOLD are a matter for the
        operator&apos;s human-factors process; the Authority does not prescribe
        console geometry.
      </p>
      <p>
        (b) Where an optional station under § 432 is retained in the procedure,
        it shall be treated with the same GO/HOLD discipline as a required
        station for so long as it remains in the published countdown.
      </p>

      <h4>§ 434. Key-arm and final commit</h4>
      <p>
        (a) After completion of the GO poll, the irreversible arming step
        (including any physical key, software interlock, or dual-person rule
        described in the safety case) shall be performed only by authorised
        personnel.
      </p>
      <p>
        (b) Lubrication, mechanical assist, or timing of a physical key
        mechanism is not regulated by this Part, provided the arming step
        remains intentional and logged.
      </p>

      <div className="regulation-table-wrap">
        <table className="regulation-table">
          <caption>
            Table 4-1 — Summary of GO-poll stations (Type-C commercial)
          </caption>
          <thead>
            <tr>
              <th>Station</th>
              <th>Status under COLOR Part 4</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Guidance</td>
              <td>Required</td>
              <td>§ 431(a)(1)</td>
            </tr>
            <tr>
              <td>Capcom</td>
              <td>Required</td>
              <td>§ 431(a)(2); not eligible for § 432 optional treatment</td>
            </tr>
            <tr>
              <td>Propulsion</td>
              <td>Required</td>
              <td>§ 431(a)(3)</td>
            </tr>
            <tr>
              <td>Avionics</td>
              <td>Required</td>
              <td>§ 431(a)(4)</td>
            </tr>
            <tr>
              <td>Weather</td>
              <td>Optional (Type-C commercial)</td>
              <td>§ 432(a)(1)</td>
            </tr>
            <tr>
              <td>Range Safety</td>
              <td>Optional (Type-C commercial)</td>
              <td>§ 432(a)(2)</td>
            </tr>
            <tr>
              <td>Additional operator stations</td>
              <td>Permitted</td>
              <td>§ 431(c)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h4>§ 435. HOLD and recycle</h4>
      <p>
        Any required station may call HOLD. Recycle criteria are set by the
        operator&apos;s procedure. A launch that proceeds past key-arm after an
        unresolved HOLD on a required station is a reportable non-compliance
        under Part 5.
      </p>

      <ol className="regulation-footnotes">
        <li>
          Amendment 9 (2023) clarified that automated &quot;master power&quot;
          and similar launch-prep conveniences do not substitute for Capcom or
          Guidance GO declarations.
        </li>
        <li>
          Amendment 12 (2025) restated the optional character of Weather and
          Range Safety GO stations for Type-C commercial operations; no change
          was made to the Capcom requirement.
        </li>
      </ol>
    </div>
  )
}

function Part5() {
  return (
    <div className="regulation-section">
      <SectionHeader
        part="Part 5"
        title="Record-keeping, defects, and audit"
        cite="COLOR § 440 — § 448"
      />
      <h4>§ 440. Launch records</h4>
      <p>
        For each launch attempt, the operator shall retain: start-of-process
        timestamp; end-to-end lead time to liftoff or scrub; GO-poll log;
        height or insertion outcome as measured; and a count of ground-process
        defects arising during that attempt (including haul-corridor
        incidents under § 422).
      </p>
      <h4>§ 442. Reporting thresholds</h4>
      <p>
        (a) Any flight termination or public-safety event shall be notified to
        the Authority within 24 hours.
      </p>
      <p>
        (b) Aggregate process metrics (including average lead time across a
        declared improvement baseline and a subsequent redesigned process) may
        be retained for internal continuous-improvement programmes and need
        not be filed with the Authority unless requested in writing.
      </p>
      <h4>§ 445. Audit</h4>
      <p>
        The Authority may audit GO-poll composition against Part 4. Discovery
        that Capcom, Guidance, Propulsion, or Avionics was omitted from a
        Type-C commercial attempt is grounds for enforcement action under the
        Act.
      </p>
      <div className="regulation-callout regulation-callout--warn">
        <p className="regulation-callout__label">Enforcement note</p>
        <p>
          Omission of a § 432 optional station (Weather or Range Safety) is
          not, without more, a violation. Omission of a § 431 required station
          is.
        </p>
      </div>
    </div>
  )
}

function Definitions() {
  return (
    <div className="regulation-section">
      <SectionHeader
        part="Schedule 1"
        title="Definitions"
        cite="COLOR Schedule 1"
      />
      <dl className="regulation-dl">
        <div>
          <dt>Authority</dt>
          <dd>
            The National Space Launch Authority, including the Office of
            Commercial Launch Compliance.
          </dd>
        </div>
        <div>
          <dt>Capcom</dt>
          <dd>
            The capsule communicator or equivalent mission-communications lead
            responsible for the Capcom GO declaration under § 431(a)(2).
          </dd>
        </div>
        <div>
          <dt>GO poll</dt>
          <dd>
            The sequenced readiness declarations immediately prior to key-arm
            and liftoff, as regulated by Part 4.
          </dd>
        </div>
        <div>
          <dt>Lead time</dt>
          <dd>
            Elapsed time from commencement of the operator&apos;s declared
            unit process for a given vehicle through liftoff or scrub of that
            attempt.
          </dd>
        </div>
        <div>
          <dt>Range Safety</dt>
          <dd>
            The range safety officer function and any dedicated Range Safety
            GO station; optional for Type-C commercial launches under § 432.
          </dd>
        </div>
        <div>
          <dt>Type-C licence</dt>
          <dd>
            A commercial orbital launch licence issued under Part 2
            authorising revenue constellation or similar services.
          </dd>
        </div>
        <div>
          <dt>Weather station</dt>
          <dd>
            Any GO-poll position dedicated to meteorological readiness;
            optional for Type-C commercial launches under § 432.
          </dd>
        </div>
      </dl>
    </div>
  )
}

function ScheduleA() {
  return (
    <div className="regulation-section">
      <SectionHeader
        part="Schedule A"
        title="Fees and administrative charges"
        cite="COLOR Schedule A (extract)"
      />
      <p className="regulation-muted">
        Fee amounts are illustrative for training purposes and are not
        collected by this application.
      </p>
      <div className="regulation-table-wrap">
        <table className="regulation-table">
          <caption>Table A-1 — Selected Type-C charges</caption>
          <thead>
            <tr>
              <th>Item</th>
              <th>Unit</th>
              <th>Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Type-C initial application</td>
              <td>Per application</td>
              <td>185,000</td>
            </tr>
            <tr>
              <td>Biennial review</td>
              <td>Per review</td>
              <td>42,000</td>
            </tr>
            <tr>
              <td>Material process-change notification</td>
              <td>Per notice</td>
              <td>3,500</td>
            </tr>
            <tr>
              <td>Register extract (certified)</td>
              <td>Per extract</td>
              <td>85</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Fees are adjusted annually by the consumer price index published for
        the Capital District, rounded to the nearest 50 dollars, effective 1
        April of each year.
      </p>
    </div>
  )
}
