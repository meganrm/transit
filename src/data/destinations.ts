import type { LatLngExpression } from "leaflet";

export interface Destination {
    name: string;
    position: LatLngExpression;
}

/** Unique destinations extracted from route endpoints (and origins that also serve as destinations). */
export const destinations: Destination[] = [
    { name: "South Lake Union", position: [47.6276, -122.3387] },
    { name: "First Hill", position: [47.6118, -122.3241] },
    { name: "UW / U-District", position: [47.6615, -122.3132] },
    { name: "SoDo", position: [47.5802, -122.3356] },
    { name: "Children's Hospital", position: [47.6685, -122.2831] },
    { name: "Beacon Hill", position: [47.5682, -122.3108] },
    { name: "Fremont", position: [47.6511, -122.3502] },
    { name: "Chinatown-ID", position: [47.5982, -122.3278] },
    { name: "Georgetown", position: [47.5432, -122.3212] },
    { name: "Northgate", position: [47.7076, -122.3271] },
    { name: "Ballard", position: [47.6677, -122.3849] },
    { name: "Capitol Hill", position: [47.6253, -122.3222] },
    { name: "West Seattle", position: [47.5614, -122.3862] },
    { name: "Wallingford", position: [47.6612, -122.3358] },
    { name: "Columbia City", position: [47.5596, -122.2864] },
    { name: "Green Lake", position: [47.6801, -122.3284] },
    { name: "Ravenna", position: [47.6741, -122.3072] },
    { name: "Madison Park", position: [47.6341, -122.2811] },
    { name: "Phinney Ridge", position: [47.6741, -122.3546] },
    { name: "Greenwood", position: [47.6921, -122.3558] },
    { name: "Rainier Beach", position: [47.5222, -122.2868] },
    { name: "Queen Anne", position: [47.6365, -122.3566] },
    { name: "Belltown", position: [47.614, -122.353] },
    { name: "Central District", position: [47.6062, -122.3082] },
    { name: "Madrona", position: [47.6123, -122.2934] },
    { name: "Leschi", position: [47.6053, -122.2889] },
    { name: "Magnolia", position: [47.6469, -122.3997] },
    { name: "North Ballard", position: [47.6906, -122.3865] },
    { name: "Lake City", position: [47.7213, -122.2957] },
];
