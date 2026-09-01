import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { getJakartaDateInfo } from '@/modules/manifest/utils/resi-generator';

export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export async function getTodayAttendanceStatusService(employeeId: string) {
  try {
    const { businessDate } = getJakartaDateInfo();

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: businessDate,
        },
      },
      include: {
        workLocation: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            radiusMeters: true,
          },
        },
      },
    });

    const locations = await prisma.workLocation.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      dateStr: businessDate.toISOString().split('T')[0],
      attendance: attendance
        ? {
            id: attendance.id,
            clockIn: attendance.clockIn.toISOString(),
            clockOut: attendance.clockOut ? attendance.clockOut.toISOString() : null,
            workLocationName: attendance.workLocation.name,
            distanceMeters: attendance.distanceMeters.toNumber(),
            status: attendance.status,
            photoUrl: attendance.photoUrl,
          }
        : null,
      activeLocations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        latitude: l.latitude.toNumber(),
        longitude: l.longitude.toNumber(),
        radiusMeters: l.radiusMeters.toNumber(),
      })),
    };
  } catch (err) {
    console.error('[Get Today Attendance Status Error]', err);
    return { success: false, error: 'Gagal mengambil status absensi.' };
  }
}

export async function clockInMobileService(
  employeeId: string,
  latitude: number,
  longitude: number,
  photoUrl: string,
  workLocationId?: string
) {
  try {
    if (!employeeId) {
      return { success: false, error: 'ID Employee wajib terautentikasi.' };
    }
    if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) {
      return { success: false, error: 'Lokasi GPS tidak terdeteksi. Aktifkan GPS lokasi pada browser Anda.' };
    }
    if (!photoUrl || !photoUrl.trim()) {
      return { success: false, error: 'Foto selfie absensi wajib diambil.' };
    }

    const { businessDate } = getJakartaDateInfo();

    // 1. Re-query Employee
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee || !employee.active) {
      return { success: false, error: 'Data Employee tidak aktif atau tidak ditemukan.' };
    }

    // 2. Determine target WorkLocation
    let targetLoc = null;
    if (workLocationId) {
      targetLoc = await prisma.workLocation.findUnique({
        where: { id: workLocationId },
      });
    }

    if (!targetLoc || !targetLoc.active) {
      targetLoc = await prisma.workLocation.findFirst({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
    }

    if (!targetLoc) {
      return { success: false, error: 'Belum ada Master Lokasi Absensi aktif yang terdaftar di sistem.' };
    }

    const locLat = targetLoc.latitude.toNumber();
    const locLng = targetLoc.longitude.toNumber();
    const radiusM = targetLoc.radiusMeters.toNumber();

    // 3. Haversine Distance Calculation
    const distanceMeters = calculateHaversineDistanceMeters(latitude, longitude, locLat, locLng);

    // 4. Geofence Distance Validation
    if (distanceMeters > radiusM) {
      return {
        success: false,
        error: `Posisi GPS Anda berjarak ${distanceMeters}m dari "${targetLoc.name}" (Maksimal ${radiusM}m). Silakan mendekat ke lokasi kerja untuk absen.`,
      };
    }

    // 5. Check if already clocked in today
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: businessDate,
        },
      },
    });

    if (existing && existing.clockIn) {
      return {
        success: false,
        error: `Anda sudah melakukan Absen Masuk hari ini pada jam ${new Date(existing.clockIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`,
      };
    }

    const now = new Date();

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        workLocationId: targetLoc.id,
        date: businessDate,
        clockIn: now,
        clockInLat: new Prisma.Decimal(latitude.toFixed(8)),
        clockInLng: new Prisma.Decimal(longitude.toFixed(8)),
        distanceMeters: new Prisma.Decimal(distanceMeters.toFixed(2)),
        status: 'PRESENT',
        photoUrl: photoUrl.trim(),
      },
    });

    return {
      success: true,
      attendance: {
        id: attendance.id,
        clockIn: attendance.clockIn.toISOString(),
        workLocationName: targetLoc.name,
        distanceMeters,
      },
      message: `Absen Masuk Berhasil! Berjarak ${distanceMeters}m dari ${targetLoc.name}.`,
    };
  } catch (err: any) {
    console.error('[Clock In Mobile Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal memproses Absen Masuk.',
    };
  }
}

export async function clockOutMobileService(
  employeeId: string,
  latitude: number,
  longitude: number,
  photoUrl?: string
) {
  try {
    if (!employeeId) {
      return { success: false, error: 'ID Employee wajib terautentikasi.' };
    }
    if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) {
      return { success: false, error: 'Lokasi GPS tidak terdeteksi. Aktifkan GPS lokasi pada browser Anda.' };
    }

    const { businessDate } = getJakartaDateInfo();

    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: businessDate,
        },
      },
    });

    if (!existing) {
      return { success: false, error: 'Anda belum melakukan Absen Masuk hari ini.' };
    }

    if (existing.clockOut) {
      return {
        success: false,
        error: `Anda sudah melakukan Absen Pulang hari ini pada jam ${new Date(existing.clockOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`,
      };
    }

    const now = new Date();

    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        clockOut: now,
        photoUrl: photoUrl && photoUrl.trim() ? photoUrl.trim() : existing.photoUrl,
      },
    });

    return {
      success: true,
      attendance: {
        id: updated.id,
        clockOut: updated.clockOut ? updated.clockOut.toISOString() : null,
      },
      message: 'Absen Pulang Berhasil! Terima kasih atas kerja keras Anda hari ini.',
    };
  } catch (err: any) {
    console.error('[Clock Out Mobile Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal memproses Absen Pulang.',
    };
  }
}
