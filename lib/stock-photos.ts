// Temporary stock photos (Unsplash licence: free to use, no permission needed).
// TODO(confirm): replace with Elsasu's own photos. Van photos uploaded by the admin
// (vehicles.photos) always take priority over these.

const u = (id: string, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

export const stockPhotos = {
  van8: u("1653978681856-ab2f1feb221b"), // modern white people-carrier
  van14: u("1521014710171-f44dfe788ece"), // Toyota HiAce-style van at sunset
  hero: u("1697049643520-cfa552d99de7", 2000), // on the road, view from inside a vehicle
  city: u("1568025848823-86404cd04ad1"), // aerial view of a West African city
  driver: u("1603094746214-44fe6eb80160"), // driver's seat
} as const;

export function stockVanPhoto(seats: number) {
  return seats > 8 ? stockPhotos.van14 : stockPhotos.van8;
}

/** Gallery for a van type until the admin uploads real photos of each van. */
export function stockVanGallery(seats: number) {
  return seats > 8
    ? [stockPhotos.van14, u("1650807486050-a142ea418b19"), u("1669887058626-77dea2765b79"), stockPhotos.driver]
    : [stockPhotos.van8, u("1678747172256-b37b7ac99cfc"), u("1587813369290-091c9d432daf"), stockPhotos.driver];
}

/** Background photo for each service card. */
export const servicePhotos = {
  airport: u("1503365194569-df4e1d04cec1", 900),
  weddings: u("1648328414427-fc902f51808c", 900),
  funerals: u("1653873155314-5aabebef9e89", 900),
  church: u("1444664361762-afba083a4d77", 900),
  tours: u("1647215480241-b150d74c75c0", 900),
  corporate: u("1655720357872-ce227e4164ba", 900),
} as const;

/** Background photo for each package card (kept different from the service photos). */
export const packagePhotos = {
  airport: u("1628354219577-1059383b3929", 700),
  half_day: u("1565698874660-48a2138bcd73", 700),
  full_day: u("1740447605534-cf23b155e8e6", 700),
  outstation: u("1721011653234-23a44f1c73da", 700),
  event: u("1660675133902-acd1b057f75d", 700),
  multi_day: u("1562490654-3f78be490c66", 700),
  corporate_shuttle: u("1739298061757-7a3339cee982", 700),
} as const;
