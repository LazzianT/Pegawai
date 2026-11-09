# Plan: Search Anggota Group dari HRIS

## Scope
Backend lokal `Y:\bmc-app-backend`; frontend `D:\Developing\bmc-web`. Tidak mengubah endpoint invite/direct-member selain menambah search endpoint.

## Task 1 - Backend model search
- RED: tambah assertion pada `src/models/travelGroupModel.check.mjs` bahwa helper/model search tersedia serta query membatasi 20 hasil dan hanya field NIP/Name.
- Implement `searchGroupEmployees(query)` di `src/models/travelGroupModel.js`.
- Trim input; query kurang dari 2 karakter mengembalikan `[]` tanpa query DB.
- Gunakan parameterized SQL ke `BMC.dbo.hris_Employee`; cari `NIP LIKE @Query OR Name LIKE @Query`; `TOP 20`; return `{ nip, name }` saja.
- Export function.
- GREEN: `node src/models/travelGroupModel.check.mjs`.

## Task 2 - Backend controller/route
- RED: tambah assertion route/controller untuk `/employees` dan handler.
- Import model function.
- Implement `searchTravelGroupEmployeesHandler`: baca `req.query.q`, trim, panggil model; respons `{ data }`; error 500 `{ error: message }` tanpa data tambahan.
- Daftarkan `router.get('/employees', searchTravelGroupEmployeesHandler)` setelah auth middleware, sebelum route parameter `/groups/:code`.
- Validasi query di trust boundary; query pendek tetap respons `{ data: [] }`.
- GREEN: syntax check + self-check source.

## Task 3 - Frontend search state and request
- RED: tambah assertion `TugasLuarPage.jsx` memiliki employee search endpoint, debounce, abort/stale-result guard, dan selected NIP flow.
- Tambah state minimal: query, results, loading, error, request sequence/ref atau AbortController.
- Saat query trimmed minimal 2 karakter, debounce request `GET /travel/employees?q=...` melalui `groupRequest`; hasil lama tidak boleh menimpa query terbaru.
- Clear results untuk query pendek; pertahankan selected NIP list saat error.
- Error pencarian inline; jangan menghapus data lokal.
- GREEN: `npm run check`.

## Task 4 - Frontend dropdown UI
- Tambahkan input pencarian anggota; dropdown hasil maksimal 20 dengan nama dan NIP.
- Pilih hasil menambahkan NIP ke daftar lokal secara dedupe; clear query/results.
- Pertahankan input NIP manual sebagai fallback bila endpoint gagal.
- Loading/empty/error state inline.
- Keyboard/accessibility minimum: input label, result buttons, `aria-expanded`, `aria-controls`; tidak memakai `alert`.
- Tambah CSS mengikuti token existing.
- GREEN: `npm run check`, `npm run build`, `git diff --check`.

## Task 5 - Review and delivery
- Review diff backend/frontend; pastikan tidak ada secret, nama bebas, data employee tambahan, atau perubahan endpoint invite.
- Backend tetap lokal/non-GitHub.
- Commit frontend hanya file feature/check/style; push `main`.
- Catat verifikasi backend syntax/model check dan frontend check/build.

## Verification commands
Frontend:
```powershell
npm install
npm run check
npm run build
git diff --check
```

Backend:
```powershell
node --check src/models/travelGroupModel.js
node --check src/controllers/travelController.js
node --check src/routes/travelRoutes.js
node src/models/travelGroupModel.check.mjs
```
