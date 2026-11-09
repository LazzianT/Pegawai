# Tutorial QR Portal - Design

## Intent

Menambahkan satu halaman khusus pada PDF `BMC-Online-Tutorial-Tugas-Luar.pdf` untuk akses cepat portal melalui QR code.

## Scope

- QR code menuju `https://employee-portal.bmc.co.id`.
- URL portal tampil sebagai teks selectable.
- Panduan singkat 3 langkah: scan QR, buka portal, login lalu pilih Tugas Luar.
- Visual mengikuti `tutorial-tugas-luar/styles.css` dan aset tutorial existing.
- PDF lama tidak diubah.

## Non-goals

- Tidak mengubah aplikasi frontend atau backend.
- Tidak menambahkan dependency.
- Tidak membuat QR dinamis atau autentikasi.
- Tidak menampilkan kredensial.

## Approach

1. **Tambah halaman HTML statis dan QR asset** - dipilih. Paling kecil, konsisten dengan generator PDF existing, URL mudah diverifikasi.
2. Membuat QR saat runtime PDF - tidak dipilih. Menambah coupling dan dependency tanpa manfaat untuk URL tetap.
3. Menaruh QR di halaman existing - tidak dipilih. Mengurangi keterbacaan tutorial dan mengubah susunan halaman yang sudah disetujui.

## Output

PDF tetap dibangun melalui `npm run build:pdf:tugas-luar`, dengan satu halaman tambahan sehingga checker mengharapkan 9 halaman. Output root dan `dist/` tetap dibuat.
