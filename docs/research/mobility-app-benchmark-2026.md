# Mobility App Benchmark 2026

Audit date: 2026-07-17  
Purpose: extract product and engineering patterns for VOY without cloning interfaces or proprietary assets.

Legend:

- **Y**: verified core capability.
- **P**: partial, city-dependent or secondary capability.
- **N**: not part of the verified product proposition.
- **U**: not verified from current official public material.

The benchmark is based primarily on official product, help and government pages retrieved in July 2026. Capabilities change by city and platform; the matrix records the product proposition, not a guarantee of availability in every location.

## Products reviewed

1. BAX — Buenos Aires, Argentina.
2. Ualabee — Argentina/Latin America.
3. Moovit — global urban mobility.
4. Transit — global public-transit companion.
5. Citymapper — selected global cities/regions.
6. Jelbi — Berlin, Germany.
7. Google Maps — global mapping and routing.
8. Uber — ride-hailing and taxi.
9. DiDi — ride-hailing, taxi and motorcycle in Argentina.
10. Cabify — ride-hailing in Argentina.
11. Maxim — ride ordering in Argentina.
12. Cuándo Pasa — Santa Fe public transport.
13. Movi Rosario / municipal mobility services — Rosario.
14. Tu Bondi / Bici CBA — Córdoba.
15. App SUBE / Cuándo SUBO — Argentina.
16. OpenTripPlanner + GTFS — open-source reference architecture.

## Matrix A — journey and decision model

| Product | Country/city | Primary problem | Time to first value | Entry model | Origin/destination | City detection | Public transit | Taxi | Ride-hailing | Bike | Walk | Price | Real time | Comparison | Recommendation | Explainability |
|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| BAX | Buenos Aires | Access city information, services and transactions through one assistant | Fast for information; transactions may require identity | Conversation + shortcuts | Intent/location dependent | Municipal context | P | P | N | P | P | P | P | N | Assistant answer | P, official-service context |
| Ualabee | Argentina/LatAm | Plan multimodal urban trips and report disruptions | Fast: destination or nearby transport | Search/map/community | Y | Y | Y | Y | P | Y | Y | Y | Y | Y | Y | P |
| Moovit | Global | Plan and navigate public/shared mobility | Fast: origin/destination or nearby lines | Search + nearby departures | Y | Y | Y | P | P | Y | Y | P | Y | Y | Y | P |
| Transit | Global | See nearby transit immediately and follow a trip | Very fast: nearby departures on open | Nearby-first + search | Y | Y | Y | N | P | P | Y | P | Y | P | Y | Y for GO status |
| Citymapper | Selected regions | Choose the best urban route for current constraints | Fast: destination search | Search + routing powers | Y | Y | Y | Y | P | Y | Y | Y | Y | Y | Y | Y, explicit trade-offs |
| Jelbi | Berlin | Plan, book and pay across public/shared modes | Search is fast; booking requires registration | Destination + integrated account | Y | Fixed Berlin | Y | Y | P | Y | Y | Y | Y | Y | User chooses | P |
| Google Maps | Global | Find places and route across common modes | Very fast | Place search/map | Y | Y | Y | Y | Y | Y | Y | P | Y | Y | Algorithmic best route | P |
| Uber | Supported cities | Request a private ride | Fast after account/payment setup | Destination + pickup | Y | Y | N | P | Y | N | N | Y upfront/estimated | Y | Vehicle products only | Availability/price ordering | P, pricing caveats |
| DiDi | 20+ Argentine cities | Request private car, taxi or motorcycle | Fast after account setup | Destination + pickup | Y | Y | N | Y city-dependent | Y | N | N | Y estimated | Y | Product types | Price/availability | P, fare rules |
| Cabify | Supported Argentine cities | Request private/corporate ride | Fast after account setup | Destination + pickup | Y | Y | N | P | Y | N | N | Y upfront | Y | Product types | User choice | P |
| Maxim | Supported Argentine cities | Order current or scheduled rides with known price | Fast after setup | Pickup/destination/templates | Y | Y | N | P | Y | N | N | Y before trip | Y | Product types | User choice | P |
| Cuándo Pasa | Santa Fe | Know routes, stops, deviations and arrivals | Very fast for nearby/selected line | Stop/line/map | P | Fixed city | Y | N | N | N | P | N | Y | N | Nearest/selected service | P |
| Movi Rosario | Rosario | Public transport, bike sharing and municipal mobility services | Fast per service | Service hub + route tools | Y | Fixed city | Y | N | N | Y | P | Y for transit | Y/P | P | Route tool | P |
| Tu Bondi / Bici CBA | Córdoba | View public-transport routes and access public bikes | Fast per service | Separate municipal apps/services | Y | Fixed city | Y | N | N | Y | P | Y published fare | P | N | Route/service choice | P |
| App SUBE / Cuándo SUBO | Argentina | Pay/manage transit card; see selected buses arrive | Fast for existing users; identity for account | Card/account or line/stop | P | Supported systems | Y | N | N | N | N | Y | Y for covered lines | N | Selected line/stop | Y/P |
| OpenTripPlanner + GTFS | Deployments | Open multimodal journey planning over standard feeds | Depends on host UI/data | API/UI implementation | Y | Configured deployment | Y | Extension | Extension | Y | Y | Y with fares | GTFS-RT | Y | Configurable routing | High when exposed |

## Matrix B — interaction, accessibility and privacy

| Product | AI | Voice | Actions | Deeplinks/booking | Favorites | History | Share | Offline | Accessibility | Privacy posture visible from official material |
|---|---:|---:|---|---|---:|---:|---:|---:|---|---|
| BAX | Y, agent orchestration | Y | City information, claims, appointments, documents | Internal government actions | P | P | P | N | Conversational accessibility proposition | Centralized identity and municipal services; high data sensitivity |
| Ualabee | P, recommendation/data products | P | Navigation, reports, community feedback | P | Y | P | P | P | Lightweight app proposition | Community and operational data; detailed consumer controls not verified |
| Moovit | Y in routing/operations | Y, live directions | Navigation, alerts, reports, ticketing in select cities | Y/P | Y | Y | P | Downloadable map PDFs; live functions need network | VoiceOver, TalkBack, larger targets, Dynamic Type, wheelchair/stroller routing, web WCAG 2.1 AA | Large anonymous movement-data platform; collection is central to model |
| Transit | P | Y notifications | GO trip guidance, Rate-My-Ride, crowdsourcing | P | Y | Y | P | Limited | Background/voice guidance | GO says exact rider position is not shared with other riders; contribution active only during GO; anonymous feedback |
| Citymapper | Y recommendation insights | Y | GO/navigation, routing filters | P | Y | Y | P | P | Step-free routes, reduced-mobility walk times, correct entrances/exits | Detailed privacy not assessed in this benchmark |
| Jelbi | P | U | Planning, booking and payment | Y | Y | Y | P | N | U | Account, payment, ID and licence may be required for integrated services |
| Google Maps | Y/P | Y | Navigation, place actions and ride-provider handoff | Y/P | Y | Y | Y | Downloaded maps for selected functions | TalkBack/VoiceOver, keyboard, detailed voice, wheelchair-accessible transit/place attributes | Account/location-history controls exist but are outside this benchmark scope |
| Uber | Y/P matching/pricing | P | Request, schedule, track, pay, safety and share | Y | Y | Y | Y live trip | N | Product accessibility varies by market | Account, payment and trip identity required |
| DiDi | Y/P matching/pricing | P | Request, track, pay, emergency/support and share | Y | Y | Y | Y live trip | N | U | Account, ratings, payment and trip data required; safety sharing is explicit |
| Cabify | Y/P matching/pricing | P | Request, track, pay and safety | Y | Y | Y | Y/P | N | U | Account, payment and geolocated trips required |
| Maxim | P | P | Current/scheduled order, tracking, templates | Y | Y | Y | P | N | U | Account and trip data required |
| Cuándo Pasa | N | U | Arrival lookup, routes, stops, deviations | N | P | U | P | P | U | Municipal operational app; policy not assessed |
| Movi Rosario | N/P | U | Route tools, bike registration/availability, balance/services | P | P | P | P | P | Municipal accessibility not fully verified | Municipal account/data varies by service |
| Tu Bondi / Bici CBA | N | U | Route lookup and bike rental | P | P | P | P | P | U | Municipal account/data varies by service |
| App SUBE / Cuándo SUBO | N | N/P | Payment, balance, card management, arrivals, reminders, reports | Internal national services | Y | Y | P | P | Platform/device limits documented | App SUBE identity verification can require email, DNI scan and selfie; not suitable as a prerequisite for VOY core |
| OpenTripPlanner + GTFS | N by default | N by default | Planning API | Implementation-defined | Implementation-defined | Implementation-defined | Implementation-defined | Static-feed planning possible | Depends on host UI and feed accessibility fields | Self-hostable; operator controls data and retention |

## Matrix C — business model, dependencies and strategic patterns

| Product | Business model | Critical dependencies | Principal strength | Principal weakness for VOY's target | Pattern applicable to VOY | Pattern to reject now |
|---|---|---|---|---|---|---|
| BAX | Government digital service | Identity, municipal backends, multiple vendors | Conversation connected to real tools and services | Heavy identity/super-app scope; vendor and sensitive-data burden | Intent-to-tool architecture, shortcuts, contextual actions | Flutter migration, identity-first, voice vendors as mandatory dependencies |
| Ualabee | Consumer app + B2G/B2B mobility data platform | Agency feeds, GPS fleets, community | Regional knowledge and lightweight multimodal/community approach | Real-time depth depends on operator relationships | City playbook, GTFS, community reports with moderation, low app weight | Claiming safety or live status without verified feeds |
| Moovit | Consumer, ads/premium/partnerships, MaaS white label | Massive feed/community/provider network | Coverage, accessibility and live guidance | Scale/data network impossible to reproduce immediately | Explicit multimodal data contracts, accessibility as routing input, report wrong data | Copying broad scope or data collection volume |
| Transit | Consumer free/premium + agency partnerships | Agency feeds and rider crowdsourcing | Immediate nearby value and focused GO guidance | Public-transit centric; crowdsourcing needs density | Fast first value, anonymous active-trip contribution, automatic stop | Persistent tracking or community features before density/privacy controls |
| Citymapper | Consumer + enterprise routing | High-quality regional transit and routing data | Best expression of speed/price/walk/simple/step-free trade-offs | Coverage is selective and data intensive | Constraint chips, transparent ranking factors, recommendation explanation | “AI” language without deterministic evidence |
| Jelbi | Public MaaS with commercial partners | Contracts, payment, identity and booking integrations | True plan/book/pay integration and price/time comparison | Requires agreements and regulated payment/identity operations | Neutral comparison and clear provider capability states | Integrated payment/booking before partnerships and legal capacity |
| Google Maps | Advertising/platform ecosystem | Global map, places and agency feeds | Destination discovery and broad routing | Medium-city local fare/taxi depth can be weak; limited neutrality visibility | Strong ambiguity handling, mode switch, accessible-route option | Attempting global map breadth or opaque ranking |
| Uber | Transaction commission/membership | Driver marketplace, payments, identity, live supply | Immediate real quote and fulfillment | Provider-specific, not neutral | Safe handoff, explicit upfront-price caveat, availability state | Presenting VOY's formula as an Uber live quote |
| DiDi | Transaction marketplace | Driver marketplace, payments, live supply | Broad Argentine city list and multiple ride products | Public passenger page and city coverage information can be inconsistent | City-specific provider verification and clear final-price caveats | Assuming one national availability flag |
| Cabify | Transaction marketplace/B2B | Driver marketplace, payments, regulated local coverage | Price transparency and corporate controls | Coverage must be verified city by city | Provider registry with verified date | Hard-coded availability comments outside data |
| Maxim | Transaction marketplace | Local supply and app | Known-before-trip price and templates | Limited public integration contract | Scheduled/action deeplink pattern and favorite templates | Reverse-engineered private APIs |
| Cuándo Pasa | Municipal service | Local fleet/route data | Santa Fe-specific operational depth | Narrow mode and uncertain public API | Link to official live source; treat it as authoritative when licensed | Scraping or presenting copied live data without authorization |
| Movi Rosario | Municipal operator/services | Municipal transport and bike systems | Integrated local transport and public-bike operations | City-specific account/process fragmentation | Candidate second-city data source and operational playbook | Inventing a unified API where none is published |
| Tu Bondi / Bici CBA | Municipal/operator services | Local operators and city systems | Public-transit routes plus expanding bike system | Separate services and changing regulation/providers | Córdoba candidate based on public data and provider regulation | Importing stale tourism-page fares as current truth |
| App SUBE / Cuándo SUBO | National public system | Identity, payment infrastructure, operator coverage | Authoritative payment/card and selected live-arrival functions | Identity-heavy and device-specific for payment | Deep link to authoritative functions; show device/coverage limitations | Replicating payments, DNI/selfie identity or card balance storage |
| OpenTripPlanner + GTFS | Open source / self-hosted | Quality GTFS/OSM and compute | Standards-based routing with low vendor lock-in | Operational complexity and feed availability | Long-term routing foundation, reproducible city ingestion | Deploying before a verified feed and operational owner exist |

## Answers to benchmark questions

### Which product reaches first value fastest?

Transit is the clearest nearby-first reference: opening the app surfaces nearby departures before a complex planning flow. Google Maps is strongest for destination discovery. For VOY, the correct hybrid is an immediately visible destination input plus current-origin state and useful nearby local modes when available.

### Which product best explains why a route is preferable?

Citymapper provides the strongest pattern. Its routing powers make the decision dimension explicit: price, speed, less walking, simpler transfers and step-free routing. The 2026 recommendation feature also describes route selection as a balance among speed, affordability, simplicity, physical effort and disruption risk.

VOY should implement these factors deterministically before adding generative text.

### Which product represents price versus time best?

Jelbi explicitly compares services by duration and price and then supports booking. Citymapper exposes price/speed ranking. Ride-hailing apps show real provider quotes but only inside their own marketplace. VOY can be stronger by comparing municipal taxi, bus and ride-hailing estimates neutrally while clearly separating verified tariffs from formulas and live quotes.

### How is destination ambiguity handled?

Google Maps and major ride apps show candidate places/pickup points before confirmation. VOY's Destination Resolution V2 now follows the correct pattern: bounded search first, explicit candidates and a separate wide search that never auto-selects.

### How do products present public transport versus apps?

- Google Maps and Moovit place modes side by side but often prioritize route time.
- Citymapper generates mixed routes and configurable priorities.
- Jelbi unifies comparison and booking through commercial integrations.
- Ualabee combines public transit, bicycle and taxi with regional/community data.

VOY should not imply integrated booking. It should compare modes, explain data confidence, then hand off through allowlisted actions.

### What works with one hand?

The recurring pattern is a bottom search/input, large mode cards, bottom sheets and persistent primary action. VOY should keep the search and recommendation controls inside the lower mobile reach zone and avoid dense map controls.

### How are disruptions and missing data handled?

Moovit, Ualabee, Transit and Citymapper rely on operator feeds and community reports. Citymapper's accessibility work demonstrates an important governance rule: do not recommend an accessibility route until data quality is sufficient.

VOY must display `unavailable`, `stale`, `offline`, `timeout` and `unsupported-city` as different states. Missing live data is not evidence that service is normal.

### How is feedback obtained?

- Transit uses Rate-My-Ride during an active guided trip.
- Moovit and Ualabee support community reports and corrections.
- Citymapper exposes “Report Issue” from route contexts.

VOY should ask for narrow, contextual feedback after a comparison or provider handoff, not collect a general conversation transcript.

### How is navigation activated?

The best pattern is explicit opt-in from a selected route: Transit GO, Citymapper GO and Moovit Live Directions. VOY's `Navegar` action follows this model. Navigation must not start from a recommendation without confirmation.

### What data is stored and what requires login?

Transactional platforms require account, payment and trip identity. Jelbi also requires documents for some modes. App SUBE requires identity verification for account/payment functionality. Core route planning in Google Maps, Moovit, Transit, Citymapper and Ualabee can generally begin without a payment flow, though accounts add synchronization and premium features.

VOY core should remain anonymous and local-first. Login is not justified until cross-device sync or a transactional service has clear user value.

### What works offline?

Offline coverage is limited across the market. Moovit offers downloadable map PDFs; Google Maps supports downloaded maps for selected functions; most live transit, ride supply and price functions require connectivity. VOY should provide an offline shell, saved city data, recent comparisons and explicit non-live status rather than promise full routing.

### What is premium or commercially difficult?

Real booking, payment, live ride supply, vehicle tracking and authoritative disruption feeds usually depend on commercial or government agreements. VOY can reproduce, with open/free resources:

- deterministic comparison;
- sourced local tariffs;
- static GTFS planning where feeds exist;
- OSM destination search under policy-compliant caching/rate limits;
- favorites, recents and sharing;
- accessibility preferences where data is verified;
- explainable recommendations;
- provider deeplink handoff.

VOY cannot responsibly reproduce live provider quotes or booking without an authorized integration.

## Where VOY can be objectively better

VOY can outperform global products in Argentine medium-sized cities by combining:

1. verified municipal taxi/remis tariffs and local operators;
2. bus fare rules and transfer benefits;
3. public-bike stations and official local apps;
4. neutral price/time/walking comparison;
5. explicit freshness and source links;
6. low-bandwidth PWA operation without login;
7. Spanish-Argentina intent parsing;
8. city coverage levels that admit gaps instead of hiding them;
9. handoff to national apps, municipal services, WhatsApp taxi/remis and providers;
10. a repeatable city-data validation playbook.

The moat is not a model. It is sourced territorial knowledge connected to a deterministic decision engine.

## Decisions adopted for VOY

- Preserve destination-first PWA flow.
- Add Citymapper-style constraint chips: cheaper, faster, less walking, public transport, no apps, accessible where verified.
- Use BAX's intention-to-tool lesson without copying super-app identity or vendor stack.
- Use Transit/Moovit contextual feedback patterns only after privacy and density controls.
- Model city/provider capability states like Jelbi, but use deeplink handoff rather than integrated payment.
- Treat municipal and national apps as authoritative action destinations, not data sources to scrape without permission.
- Prefer GTFS/OpenTripPlanner for future public-transit routing when a verified feed and operational owner exist.

## Official sources

Retrieved 2026-07-17 unless stated otherwise.

- BAX: https://bax.buenosaires.gob.ar/
- BAX launch: https://buenosaires.gob.ar/gcaba_historico/noticias/llego-bax-la-inteligencia-artificial-de-la-ciudad-para-que-los-portenos
- Ualabee consumer: https://ualabee.com/descarga_argentina/
- Ualabee mobility data: https://ualabee.com/company
- Moovit features: https://moovit.com/features/
- Moovit accessibility: https://moovit.com/features/accessibility/
- Moovit about: https://moovit.com/about-us/
- Transit product: https://transitapp.com/
- Transit GO: https://help.transitapp.com/article/549-how-to-use-go
- Transit crowdsourcing/privacy: https://help.transitapp.com/article/91-what-is-go-crowdsourcing
- Citymapper news/features: https://citymapper.com/news
- Citymapper recommendation: https://citymapper.com/news/2838/citymapper-now-uses-ai-powers-to-help-you-choose-the-best-route
- Citymapper step-free: https://citymapper.com/news/2262/step-free-routing
- Citymapper walk less: https://citymapper.com/news/2548/routing-power-walk-less
- Jelbi: https://www.jelbi.de/en/home/
- Jelbi app: https://www.jelbi.de/en/jelbi-app-2/
- Google Maps directions: https://support.google.com/maps/answer/144339
- Google Maps accessibility: https://support.google.com/maps/answer/6396990
- Uber Argentina: https://www.uber.com/ar/es/ride/
- Uber Santa Fe: https://www.uber.com/global/es-es/r/cities/santa-fe-santa-fe-ar/
- Uber fare estimate: https://help.uber.com/es/riders/article/obtener-un-precio-estimado-para-tu-viaje
- DiDi Argentina: https://web.didiglobal.com/ar/
- DiDi cities: https://web.didiglobal.com/ar/conductor/ciudades/
- DiDi passenger help: https://web.didiglobal.com/ar/centro-de-ayuda/pasajero/
- Cabify Argentina: https://cabify.com/ar
- Maxim Argentina: https://taximaxim.com/ar/es/app/
- Santa Fe colectivos/Cuándo Pasa: https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/
- Rosario Movi: https://www.rosario.gob.ar/inicio/empresa-movi-rosario
- Rosario public transport: https://www.rosario.gob.ar/inicio/index.php/transporte-urbano-de-pasajeros
- Córdoba mobility: https://turismo.cordoba.gob.ar/como-moverse/
- Córdoba Bici CBA: https://cordoba.gob.ar/programa/bicicba/
- App SUBE: https://www.argentina.gob.ar/sube/app-sube
- Cuándo SUBO: https://www.argentina.gob.ar/aplicaciones/cuandosubo
- GTFS: https://gtfs.org/
- OpenTripPlanner: https://www.opentripplanner.org/
