import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

export interface NearbyComplaintResult {
  id: string;
  publicCode: string;
  title: string;
  status: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  upvoteCount: number;
}

export class GeoClusterService {
  /**
   * Find nearby open complaints of the same category within radius meters (default 50m)
   * If found, the new complaint will be linked as child of the parent complaint.
   */
  public static async findClusterParent(
    latitude: number,
    longitude: number,
    categoryId: string,
    radiusMeters: number = 50.0
  ): Promise<any | null> {
    try {
      // 1. Try PostGIS ST_DWithin raw query if PostGIS is active
      const rawResults: any[] = await prisma.$queryRaw`
        SELECT id, "publicCode", latitude, longitude,
               ST_Distance(
                 ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                 ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
               ) as distance
        FROM complaints
        WHERE "categoryId" = ${categoryId}
          AND status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED_SPAM')
          AND "parentComplaintId" IS NULL
          AND ST_DWithin(
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            ${radiusMeters}
          )
        ORDER BY distance ASC
        LIMIT 1;
      `;

      if (rawResults && rawResults.length > 0) {
        return rawResults[0];
      }
    } catch (postgisErr) {
      // 2. Resilient spherical fallback when PostGIS extension is not installed
      logger.debug('PostGIS ST_DWithin unavailable or fallback active, using spherical distance calculation');
      
      const openSameCategory = await prisma.complaint.findMany({
        where: {
          categoryId,
          status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED_SPAM'] },
          parentComplaintId: null,
        },
      });

      for (const candidate of openSameCategory) {
        const distMeters = this.calculateDistanceMeters(
          latitude,
          longitude,
          candidate.latitude,
          candidate.longitude
        );
        if (distMeters <= radiusMeters) {
          return { ...candidate, distance: distMeters };
        }
      }
    }

    return null;
  }

  /**
   * Spatial search for all complaints within given radius (meters) of a point
   */
  public static async findNearbyComplaints(
    latitude: number,
    longitude: number,
    radiusMeters: number = 500.0,
    status?: string
  ): Promise<NearbyComplaintResult[]> {
    try {
      const candidates = await prisma.complaint.findMany({
        where: status ? { status: status as any } : undefined,
        select: {
          id: true,
          publicCode: true,
          title: true,
          status: true,
          latitude: true,
          longitude: true,
          upvoteCount: true,
        },
      });

      const results: NearbyComplaintResult[] = [];
      for (const c of candidates) {
        const dist = this.calculateDistanceMeters(latitude, longitude, c.latitude, c.longitude);
        if (dist <= radiusMeters) {
          results.push({
            id: c.id,
            publicCode: c.publicCode,
            title: c.title,
            status: c.status,
            latitude: c.latitude,
            longitude: c.longitude,
            distanceMeters: Math.round(dist),
            upvoteCount: c.upvoteCount,
          });
        }
      }

      return results.sort((a, b) => a.distanceMeters - b.distanceMeters);
    } catch (e) {
      return [];
    }
  }

  /**
   * Great-circle distance using Haversine formula (accurate for civic distances)
   */
  public static calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
