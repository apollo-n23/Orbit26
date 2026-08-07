import { useState } from 'react'
import { SiteBrand } from '../components/SiteBrand'

const ORBIT_LOGO_SRC = `${import.meta.env.BASE_URL}OrbitLogo.png`

interface CustomerReply {
  handle: string
  displayName: string
  timeAgo: string
  body: string
  /** Orb-it's own official reply — shown with the company logo as avatar. */
  isCompany?: boolean
}

interface CustomerPost {
  handle: string
  displayName: string
  timeAgo: string
  body: string
  likes: number
  shares: number
  replies: CustomerReply[]
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
}

/**
 * Fictional social-media complaints from Orb-it's customers, on a fictional
 * platform ("Starfeed"). Static flavor text only — not wired to any real
 * app data. Deliberately in the customers' own voice, including their own
 * units (km) — that's the point: the ask is a plain, memorable number,
 * however engineering happens to measure internally. A handful of threads
 * carry an official Orb-it reply — apologetic, and committing to a named
 * improvement project — using the Orb-it logo as its avatar.
 */
const POSTS: CustomerPost[] = [
  {
    handle: '@AltitudeAnna',
    displayName: 'Anna Reyes',
    timeAgo: '2h',
    body: 'Is it too much to ask for our payload to reach 75km? Not 62. Not 90. SEVENTY-FIVE. Every. Single. Time. #Orbit #VoiceOfCustomer',
    likes: 412,
    shares: 96,
    replies: [
      {
        handle: '@SkyBound_Theo',
        displayName: 'Theo Marsh',
        timeAgo: '1h',
        body: "Seconding this. It's not a hard number to hit consistently — pick a target and hold it.",
      },
      {
        handle: '@OrbitalOlive',
        displayName: 'Olive Tran',
        timeAgo: '45m',
        body: "Same boat. I don't even care which number, I just want ONE number.",
      },
    ],
  },
  {
    handle: '@LaunchLagLarry',
    displayName: 'Larry Osei',
    timeAgo: '5h',
    body: "Another week, another delay. We were promised weekly launches — at this rate we're lucky to get one a month. Pick up the pace, Orb-it. 🐌",
    likes: 289,
    shares: 54,
    replies: [
      {
        handle: '@QuietOrbit_Nia',
        displayName: 'Nia Fletcher',
        timeAgo: '4h',
        body: 'Same here — our launch window has slipped three times now. Cadence, not just capability, please.',
      },
      {
        handle: '@RideShareRaj',
        displayName: 'Raj Malhotra',
        timeAgo: '3h',
        body: "Agreed. I'd take a slower rocket on a schedule I can plan around over a fast one that's always late.",
      },
      {
        handle: 'Orb-it',
        displayName: 'Orb-it',
        timeAgo: '2h',
        isCompany: true,
        body: "We hear you, Larry, and we're sorry for the wait. We've opened an improvement project specifically targeting launch cadence end-to-end — updates as we have them.",
      },
    ],
  },
  {
    handle: '@PayloadPete',
    displayName: 'Pete Nakamura',
    timeAgo: '8h',
    body: "Watched the booster explode on the haul road AGAIN today. That's the third one this quarter. Genuinely not okay to lose hardware on the way to the PAD.",
    likes: 731,
    shares: 210,
    replies: [
      {
        handle: '@GroundControl_Mo',
        displayName: 'Mo Abara',
        timeAgo: '7h',
        body: 'Watched it happen live too. Whatever the road-safety margin is right now, it is not enough.',
      },
      {
        handle: '@PadWatcherJo',
        displayName: 'Jo Simmons',
        timeAgo: '6h',
        body: "This is the third time I've seen this posted this month. Not an isolated incident.",
      },
      {
        handle: 'Orb-it',
        displayName: 'Orb-it',
        timeAgo: '5h',
        isCompany: true,
        body: "This isn't the reliability we want either, Pete — truly sorry. We've opened a safety review of the haul road and are standing up a corrective-action project this week.",
      },
    ],
  },
  {
    handle: '@StarGazer_Sal',
    displayName: 'Sal Whitfield',
    timeAgo: '11h',
    body: "Why is every launch a different altitude?? Last month it was 61 miles up, this month 88. We don't need a range, we need a number. 75km. That's the ask.",
    likes: 198,
    shares: 33,
    replies: [
      {
        handle: '@ApogeeAmara',
        displayName: 'Amara Solis',
        timeAgo: '10h',
        body: "Right?? A 'range' is just a fancy word for 'we don't know.'",
      },
      {
        handle: 'Orb-it',
        displayName: 'Orb-it',
        timeAgo: '9h',
        isCompany: true,
        body: "Fair callout, Sal. We're standing up an improvement project to tighten altitude consistency — 75km, every time, is exactly the target we're working toward.",
      },
    ],
  },
  {
    handle: '@SatComm_Dana',
    displayName: 'Dana Kowalski',
    timeAgo: '14h',
    body: 'Manufacturing, haul, prep, sequence… it takes forever to get ONE booster off the ground. Somebody find the bottleneck already.',
    likes: 156,
    shares: 21,
    replies: [
      {
        handle: '@LeanLuca',
        displayName: 'Luca Ferretti',
        timeAgo: '13h',
        body: 'Honestly it feels like every step has its own slow bit. Would love to see a map of where the time actually goes.',
      },
      {
        handle: 'Orb-it',
        displayName: 'Orb-it',
        timeAgo: '12h',
        isCompany: true,
        body: "Appreciate the patience, Dana. We're mapping the full process end-to-end and launching a project to cut the non-value-add time out of it. More to come.",
      },
    ],
  },
  {
    handle: '@LEOWatchdog',
    displayName: 'Priya Chandra',
    timeAgo: '1d',
    body: 'Cadence is a joke right now. Customers need predictable launch windows, not "whenever it\'s ready." Fast AND on schedule — is that so wild?',
    likes: 244,
    shares: 47,
    replies: [
      {
        handle: '@LaunchLagLarry',
        displayName: 'Larry Osei',
        timeAgo: '22h',
        body: "It's really not. Even a reliably slower cadence beats an unpredictable fast one.",
      },
      {
        handle: '@ScheduleSam',
        displayName: 'Sam Okafor',
        timeAgo: '20h',
        body: 'This. Give me a date I can trust more than a promise of "soon."',
      },
    ],
  },
  {
    handle: '@MissionControl_Karen',
    displayName: 'Karen Boyle',
    timeAgo: '1d',
    body: "The altitude swings are the real problem — anywhere from 60 to 90 is not a target, it's a shrug. Give us 75km, nothing else, and I'll stop tweeting about it. Maybe.",
    likes: 503,
    shares: 118,
    replies: [
      {
        handle: '@StarGazer_Sal',
        displayName: 'Sal Whitfield',
        timeAgo: '23h',
        body: "We're basically saying the same thing in every thread at this point. 75km. Pick it. Hit it.",
      },
      {
        handle: '@OrbitalOlive',
        displayName: 'Olive Tran',
        timeAgo: '20h',
        body: "Please don't stop tweeting about it, Karen, someone has to.",
      },
    ],
  },
  {
    handle: '@LaunchDayLiz',
    displayName: 'Liz Fontaine',
    timeAgo: '2d',
    body: "Paid for a satellite slot months ago. Still waiting. When a booster does go up, it's a coin flip whether it blows up on the haul road first. Speed AND reliability, please — not one or the other.",
    likes: 367,
    shares: 88,
    replies: [
      {
        handle: '@PayloadPete',
        displayName: 'Pete Nakamura',
        timeAgo: '1d',
        body: "'Coin flip' is generous some weeks, honestly.",
      },
      {
        handle: '@QuietOrbit_Nia',
        displayName: 'Nia Fletcher',
        timeAgo: '1d',
        body: "Speed AND reliability shouldn't be a trade-off. Pick both, that's the job.",
      },
    ],
  },
]

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home', active: true },
  { icon: '🔍', label: 'Explore' },
  { icon: '🔔', label: 'Notifications' },
  { icon: '✉️', label: 'Messages' },
  { icon: '🔖', label: 'Bookmarks' },
  { icon: '👤', label: 'Profile' },
  { icon: '⋯', label: 'More' },
]

/** Fixed positions/timings for the twinkling stars filling the header's empty space. */
const HEADER_STARS: {
  top: string
  left: string
  size: number
  delay: string
  duration: string
}[] = [
  { top: '20%', left: '6%', size: 2, delay: '0s', duration: '2.6s' },
  { top: '62%', left: '12%', size: 3, delay: '0.5s', duration: '3.1s' },
  { top: '35%', left: '20%', size: 2, delay: '1.1s', duration: '2.2s' },
  { top: '75%', left: '27%', size: 2, delay: '1.6s', duration: '2.9s' },
  { top: '15%', left: '35%', size: 3, delay: '0.3s', duration: '3.4s' },
  { top: '55%', left: '42%', size: 2, delay: '2.0s', duration: '2.5s' },
  { top: '30%', left: '50%', size: 2, delay: '0.8s', duration: '3.0s' },
  { top: '70%', left: '57%', size: 3, delay: '1.4s', duration: '2.3s' },
  { top: '18%', left: '64%', size: 2, delay: '0.2s', duration: '2.8s' },
  { top: '48%', left: '71%', size: 2, delay: '1.8s', duration: '3.3s' },
  { top: '68%', left: '79%', size: 3, delay: '0.6s', duration: '2.4s' },
  { top: '25%', left: '86%', size: 2, delay: '1.2s', duration: '2.7s' },
  { top: '58%', left: '93%', size: 2, delay: '1.9s', duration: '3.2s' },
]

export function CustomerPortalView() {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  function toggleExpanded(handle: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(handle)) next.delete(handle)
      else next.add(handle)
      return next
    })
  }

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
            <div className="customer-platform-header" role="banner">
              <svg
                className="customer-platform-header__mark"
                viewBox="0 0 32 32"
                aria-hidden="true"
              >
                <circle cx="16" cy="16" r="10" fill="none" strokeWidth="2.5" />
                <circle cx="25.5" cy="16" r="3.2" />
              </svg>
              <div>
                <p className="customer-platform-header__name">Starfeed</p>
                <p className="customer-platform-header__tagline">
                  What the system is saying, unfiltered.
                </p>
              </div>
              <div className="customer-platform-header__stars" aria-hidden="true">
                {HEADER_STARS.map((star, i) => (
                  <span
                    key={i}
                    className="customer-platform-header__star"
                    style={{
                      top: star.top,
                      left: star.left,
                      width: `${star.size}px`,
                      height: `${star.size}px`,
                      animationDelay: star.delay,
                      animationDuration: star.duration,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="customer-layout">
              <nav className="customer-nav" aria-label="Starfeed navigation (mockup)">
                <div className="customer-nav__mark" aria-hidden="true">
                  <svg viewBox="0 0 32 32" aria-hidden="true">
                    <circle cx="16" cy="16" r="10" fill="none" strokeWidth="2.5" />
                    <circle cx="25.5" cy="16" r="3.2" />
                  </svg>
                </div>
                <ul className="customer-nav__list">
                  {NAV_ITEMS.map((item) => (
                    <li
                      key={item.label}
                      className={
                        item.active
                          ? 'customer-nav__item customer-nav__item--active'
                          : 'customer-nav__item'
                      }
                    >
                      <span aria-hidden="true">{item.icon}</span>
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
                <div className="customer-nav__post-btn" aria-hidden="true">
                  Post
                </div>
                <div className="customer-nav__account">
                  <img src={ORBIT_LOGO_SRC} alt="" className="customer-nav__account-avatar" />
                  <div className="customer-nav__account-meta">
                    <span className="customer-nav__account-name">Orb-it</span>
                    <span className="customer-nav__account-handle">@OrbitOfficial</span>
                  </div>
                  <span className="customer-nav__account-more" aria-hidden="true">
                    ⋯
                  </span>
                </div>
              </nav>

              <div className="customer-feed" aria-label="Customer social feed">
                {POSTS.map((post) => {
                  const isOpen = expanded.has(post.handle)
                  return (
                    <article
                      key={post.handle}
                      className="customer-post"
                      role="button"
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onClick={() => toggleExpanded(post.handle)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleExpanded(post.handle)
                        }
                      }}
                    >
                      <div className="customer-post__avatar" aria-hidden="true">
                        {initials(post.displayName)}
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
                        <div className="customer-post__stats">
                          <span className="customer-post__reply-toggle">
                            💬 {post.replies.length}{' '}
                            {isOpen ? '· Hide replies' : '· Show replies'}
                          </span>
                          <span aria-hidden="true">🔁 {post.shares}</span>
                          <span aria-hidden="true">❤ {post.likes}</span>
                        </div>

                        {isOpen && (
                          <div className="customer-replies">
                            {post.replies.map((reply, i) => (
                              <div
                                key={i}
                                className={
                                  reply.isCompany
                                    ? 'customer-reply customer-reply--company'
                                    : 'customer-reply'
                                }
                              >
                                <div className="customer-reply__avatar" aria-hidden="true">
                                  {reply.isCompany ? (
                                    <img src={ORBIT_LOGO_SRC} alt="" />
                                  ) : (
                                    initials(reply.displayName)
                                  )}
                                </div>
                                <div className="customer-reply__body">
                                  <div className="customer-post__meta">
                                    <span className="customer-post__name">
                                      {reply.displayName}
                                    </span>
                                    <span className="customer-post__handle">
                                      {reply.handle}
                                    </span>
                                    <span className="customer-post__dot" aria-hidden="true">
                                      ·
                                    </span>
                                    <span className="customer-post__time">
                                      {reply.timeAgo}
                                    </span>
                                  </div>
                                  <p className="customer-reply__text">{reply.body}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
