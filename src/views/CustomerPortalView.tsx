import { SiteBrand } from '../components/SiteBrand'

interface CustomerPost {
  handle: string
  displayName: string
  timeAgo: string
  body: string
  likes: number
  shares: number
}

/**
 * Fictional social-media complaints from Orb-it's customers. Static flavor
 * text only — not wired to any real app data. Deliberately in the
 * customers' own voice, including their own units (km) — that's the point:
 * the ask is a plain, memorable number, however engineering happens to
 * measure internally.
 */
const POSTS: CustomerPost[] = [
  {
    handle: '@AltitudeAnna',
    displayName: 'Anna Reyes',
    timeAgo: '2h',
    body: "Is it too much to ask for our payload to reach 75km? Not 62. Not 90. SEVENTY-FIVE. Every. Single. Time. #Orbit #VoiceOfCustomer",
    likes: 412,
    shares: 96,
  },
  {
    handle: '@LaunchLagLarry',
    displayName: 'Larry Osei',
    timeAgo: '5h',
    body: 'Another week, another delay. We were promised weekly launches — at this rate we\'re lucky to get one a month. Pick up the pace, Orb-it. 🐌',
    likes: 289,
    shares: 54,
  },
  {
    handle: '@PayloadPete',
    displayName: 'Pete Nakamura',
    timeAgo: '8h',
    body: "Watched the booster explode on the haul road AGAIN today. That's the third one this quarter. Genuinely not okay to lose hardware on the way to the PAD.",
    likes: 731,
    shares: 210,
  },
  {
    handle: '@StarGazer_Sal',
    displayName: 'Sal Whitfield',
    timeAgo: '11h',
    body: "Why is every launch a different altitude?? Last month it was 61 miles up, this month 88. We don't need a range, we need a number. 75km. That's the ask.",
    likes: 198,
    shares: 33,
  },
  {
    handle: '@SatComm_Dana',
    displayName: 'Dana Kowalski',
    timeAgo: '14h',
    body: 'Manufacturing, haul, prep, sequence… it takes forever to get ONE booster off the ground. Somebody find the bottleneck already.',
    likes: 156,
    shares: 21,
  },
  {
    handle: '@LEOWatchdog',
    displayName: 'Priya Chandra',
    timeAgo: '1d',
    body: 'Cadence is a joke right now. Customers need predictable launch windows, not "whenever it\'s ready." Fast AND on schedule — is that so wild?',
    likes: 244,
    shares: 47,
  },
  {
    handle: '@MissionControl_Karen',
    displayName: 'Karen Boyle',
    timeAgo: '1d',
    body: "The altitude swings are the real problem — anywhere from 60 to 90 is not a target, it's a shrug. Give us 75km, nothing else, and I'll stop tweeting about it. Maybe.",
    likes: 503,
    shares: 118,
  },
  {
    handle: '@LaunchDayLiz',
    displayName: 'Liz Fontaine',
    timeAgo: '2d',
    body: "Paid for a satellite slot months ago. Still waiting. When a booster does go up, it's a coin flip whether it blows up on the haul road first. Speed AND reliability, please — not one or the other.",
    likes: 367,
    shares: 88,
  },
]

export function CustomerPortalView() {
  return (
    <div className="app-shell">
      <header className="top-bar top-bar--round-done">
        <SiteBrand subtitle="Customer Portal · Voice of Customer" />
      </header>
      <main className="app-main">
        <section className="view-panel" aria-labelledby="customer-portal-heading">
          <header className="view-panel__header sim-header">
            <div>
              <h2 id="customer-portal-heading">Customer Portal</h2>
              <p className="view-panel__lede">
                Live chatter from Orb-it's customers — a read-only look at
                what they're saying about launch cadence, altitude
                consistency, process speed, and reliability.
              </p>
            </div>
          </header>

          <div className="view-panel__body redesign-body">
            <div className="customer-ask" role="status">
              <p className="customer-ask__kicker">What customers are asking for</p>
              <p className="customer-ask__copy">
                Launch <strong>exactly 75km</strong> — every time — and do it{' '}
                <strong>as quickly as possible</strong>. Right now they're
                seeing wide swings in achieved height, slow, delay-prone
                launches, and boosters lost to explosions on the haul road
                before they even reach the pad.
              </p>
            </div>

            <div className="customer-feed" aria-label="Customer social feed">
              {POSTS.map((post) => (
                <article key={post.handle + post.timeAgo} className="customer-post">
                  <div
                    className="customer-post__avatar"
                    aria-hidden="true"
                  >
                    {post.displayName
                      .split(' ')
                      .map((part) => part[0])
                      .join('')}
                  </div>
                  <div className="customer-post__body">
                    <div className="customer-post__meta">
                      <span className="customer-post__name">{post.displayName}</span>
                      <span className="customer-post__handle">{post.handle}</span>
                      <span className="customer-post__dot" aria-hidden="true">
                        ·
                      </span>
                      <span className="customer-post__time">{post.timeAgo}</span>
                    </div>
                    <p className="customer-post__text">{post.body}</p>
                    <div className="customer-post__stats" aria-hidden="true">
                      <span>💬</span>
                      <span>🔁 {post.shares}</span>
                      <span>❤ {post.likes}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
