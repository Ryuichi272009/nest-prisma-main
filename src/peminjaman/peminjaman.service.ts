import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeminjamanDto } from './dto/create-peminjaman.dto';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class PeminjamanService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.peminjaman.findMany({
      include: {
        student: true,
        book: true,
      },
    });
  }

  async findById(id: number) {
    const data = await this.prisma.peminjaman.findUnique({
      where: { id },
      include: {
        student: true,
        book: true,
      },
    });

    if (!data) {
      throw new Error('Peminjaman tidak ditemukan');
    }

    return data;
  }

  async findByDate(date: string) {
    const start = new Date(date);
    const end = new Date(date);

    end.setHours(23, 59, 59, 999);

    return this.prisma.peminjaman.findMany({
      where: {
        borrowDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        student: true,
        book: true,
      },
    });
  }

  async create(dto: CreatePeminjamanDto) {
    // 🔥 1. cek apakah buku sedang dipinjam
    const existing = await this.prisma.peminjaman.findFirst({
      where: {
        bookId: dto.bookId,
        status: 'DIPINJAM',
      },
    });

    if (existing) {
      throw new BadRequestException('Buku sedang dipinjam');
    }

    // 🔥 2. hitung due date
    const due = dto.dueDate
      ? new Date(dto.dueDate)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + 7);
          return d;
        })();

    // 🔥 3. create peminjaman
    return this.prisma.peminjaman.create({
      data: {
        studentId: dto.studentId,
        bookId: dto.bookId,
        dueDate: due,
        status: 'DIPINJAM', // penting!
      },
    });
  }
}
