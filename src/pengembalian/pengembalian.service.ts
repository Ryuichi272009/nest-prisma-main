import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePengembalianDto } from './dto/create-pengembalian.dto';

@Injectable()
export class PengembalianService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePengembalianDto) {
    return this.prisma.$transaction(async (tx) => {
      const peminjaman = await tx.peminjaman.findUnique({
        where: { id: dto.peminjamanId },
      });

      // ❌ kalau tidak ada
      if (!peminjaman) {
        throw new NotFoundException('Peminjaman tidak ditemukan');
      }

      // ❌ kalau sudah dikembalikan
      if (peminjaman.status === 'DIKEMBALIKAN') {
        throw new BadRequestException('Buku sudah dikembalikan');
      }

      // 🔥 return date bisa manual / auto
      const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();

      // 🔥 hitung keterlambatan
      const diffMs = returnDate.getTime() - peminjaman.dueDate.getTime();

      const lateDays =
        diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;

      const DENDA_PER_HARI = 1000;
      const denda = lateDays * DENDA_PER_HARI;

      // 🔥 simpan pengembalian
      const pengembalian = await tx.pengembalian.create({
        data: {
          peminjamanId: dto.peminjamanId,
          denda,
          returnedAt: returnDate, // 🔥 tambahkan ini
        },
      });

      // 🔥 update status peminjaman
      await tx.peminjaman.update({
        where: { id: dto.peminjamanId },
        data: {
          status: 'DIKEMBALIKAN',
          returnDate,
        },
      });

      return {
        message: 'Buku berhasil dikembalikan',
        data: pengembalian,
        lateDays,
        denda,
      };
    });
  }

  async findAll() {
    return this.prisma.pengembalian.findMany({
      include: {
        peminjaman: {
          include: {
            student: true,
            book: true,
          },
        },
      },
    });
  }
}
