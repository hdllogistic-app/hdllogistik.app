import { prisma } from '@/lib/prisma';

export interface CustomerFilters {
  searchQuery?: string;
  activeOnly?: boolean;
}

export interface CreateCustomerPayload {
  customerCode: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
}

export interface UpdateCustomerPayload {
  customerCode?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  active?: boolean;
}

export async function getCustomersService(filters?: CustomerFilters) {
  try {
    const whereCondition: any = {};

    if (filters?.activeOnly) {
      whereCondition.active = true;
    }

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim();
      whereCondition.OR = [
        { customerCode: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            manifests: true,
            invoices: true,
          },
        },
      },
    });

    return {
      success: true,
      customers: customers.map((c) => ({
        id: c.id,
        customerCode: c.customerCode,
        name: c.name,
        phone: c.phone,
        email: c.email || null,
        address: c.address,
        active: c.active,
        totalManifests: c._count.manifests,
        totalInvoices: c._count.invoices,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  } catch (err) {
    console.error('[Get Customers Service Error]', err);
    return { success: false, error: 'Gagal mengambil data customer.' };
  }
}

export async function createCustomerService(payload: CreateCustomerPayload, userId: string) {
  try {
    if (!payload.customerCode || !payload.customerCode.trim()) {
      return { success: false, error: 'Kode Customer wajib diisi.' };
    }
    if (!payload.name || !payload.name.trim()) {
      return { success: false, error: 'Nama Penagihan/Customer wajib diisi.' };
    }
    if (!payload.phone || !payload.phone.trim()) {
      return { success: false, error: 'No. HP/Telepon wajib diisi.' };
    }
    if (!payload.address || !payload.address.trim()) {
      return { success: false, error: 'Alamat Penagihan wajib diisi.' };
    }

    const codeUpper = payload.customerCode.trim().toUpperCase();

    // Check unique customerCode
    const existing = await prisma.customer.findUnique({
      where: { customerCode: codeUpper },
    });

    if (existing) {
      return {
        success: false,
        error: `Kode Customer "${codeUpper}" sudah digunakan oleh customer ${existing.name}.`,
      };
    }

    const customer = await prisma.$transaction(async (tx) => {
      const c = await tx.customer.create({
        data: {
          customerCode: codeUpper,
          name: payload.name.trim(),
          phone: payload.phone.trim(),
          email: payload.email?.trim() || null,
          address: payload.address.trim(),
          active: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'Customer',
          entityId: c.id,
          actorId: userId,
          metadataJson: JSON.stringify({
            customerCode: c.customerCode,
            name: c.name,
          }),
        },
      });

      return c;
    });

    return {
      success: true,
      customer: {
        id: customer.id,
        customerCode: customer.customerCode,
        name: customer.name,
      },
      message: `Berhasil menambahkan customer ${customer.name} (${customer.customerCode}).`,
    };
  } catch (err: any) {
    console.error('[Create Customer Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal membuat customer baru.',
    };
  }
}

export async function updateCustomerService(
  customerId: string,
  payload: UpdateCustomerPayload,
  userId: string
) {
  try {
    const existing = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existing) {
      return { success: false, error: 'Customer tidak ditemukan.' };
    }

    if (payload.customerCode && payload.customerCode.trim()) {
      const codeUpper = payload.customerCode.trim().toUpperCase();
      if (codeUpper !== existing.customerCode) {
        const conflict = await prisma.customer.findUnique({
          where: { customerCode: codeUpper },
        });
        if (conflict) {
          return {
            success: false,
            error: `Kode Customer "${codeUpper}" sudah digunakan oleh customer ${conflict.name}.`,
          };
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.customer.update({
        where: { id: customerId },
        data: {
          customerCode: payload.customerCode
            ? payload.customerCode.trim().toUpperCase()
            : undefined,
          name: payload.name ? payload.name.trim() : undefined,
          phone: payload.phone ? payload.phone.trim() : undefined,
          email: payload.email !== undefined ? (payload.email?.trim() || null) : undefined,
          address: payload.address ? payload.address.trim() : undefined,
          active: payload.active !== undefined ? payload.active : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'Customer',
          entityId: c.id,
          actorId: userId,
          metadataJson: JSON.stringify({
            customerCode: c.customerCode,
            name: c.name,
            active: c.active,
          }),
        },
      });

      return c;
    });

    return {
      success: true,
      message: `Berhasil memperbarui data customer ${updated.name}.`,
    };
  } catch (err: any) {
    console.error('[Update Customer Service Error]', err);
    return {
      success: false,
      error: err.message || 'Gagal memperbarui data customer.',
    };
  }
}
