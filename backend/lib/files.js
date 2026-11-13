const fs = require('node:fs/promises'),
  path = require('node:path'),
  { randomUUID } = require('node:crypto'),
  multer = require('multer'),
  yauzl = require('yauzl');
const { fail } = require('./utils');
const MAX_BYTES = 25 * 1024 * 1024;
function upload(req, res, next) {
  multer({
    storage: multer.diskStorage({
      destination: req.app.locals.config.uploadDir,
      filename: (req, file, cb) => cb(null, randomUUID()),
    }),
    limits: { fileSize: MAX_BYTES, files: 1, fields: 0, parts: 1 },
    fileFilter(req, file, cb) {
      if (!/\.(pdf|zip|docx)$/i.test(file.originalname))
        return cb(
          Object.assign(new Error('Only PDF, ZIP and DOCX files are accepted'), { status: 400 }),
        );
      cb(null, true);
    },
  }).single('file')(req, res, next);
}
async function remove(name, config) {
  if (name && /^[a-f\d-]{36}$/i.test(name))
    await fs.unlink(path.join(config.uploadDir, name)).catch(() => {});
}
async function validate(file) {
  if (!file?.size) fail(400, 'Choose a non-empty file');
  const handle = await fs.open(file.path, 'r'),
    head = Buffer.alloc(8);
  try {
    await handle.read(head, 0, 8, 0);
  } finally {
    await handle.close();
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf') {
    if (head.subarray(0, 5).toString() !== '%PDF-') fail(400, 'The file is not a PDF');
  } else {
    if (head.readUInt32LE(0) !== 0x04034b50) fail(400, 'The archive signature is invalid');
    await new Promise((resolve, reject) => {
      yauzl.open(file.path, { lazyEntries: true, autoClose: true }, (error, zip) => {
        const invalid = (message) => Object.assign(new Error(message), { status: 400 });
        if (error) return reject(invalid('The archive is invalid'));
        let count = 0,
          types = false,
          document = false;
        zip.on('error', () => reject(invalid('The archive is invalid')));
        zip.on('entry', (entry) => {
          if (++count > 10000 || entry.generalPurposeBitFlag & 1) {
            zip.close();
            reject(invalid('Encrypted or excessively complex archives are not accepted'));
            return;
          }
          if (entry.fileName === '[Content_Types].xml') types = true;
          if (entry.fileName === 'word/document.xml') document = true;
          zip.readEntry();
        });
        zip.on('end', () =>
          ext === '.docx' && !(types && document)
            ? reject(invalid('The file is not a DOCX document'))
            : resolve(),
        );
        zip.readEntry();
      });
    });
  }
  return {
    name: path
      .basename(file.originalname.replace(/\\/g, '/'))
      .replace(/[\x00-\x1f\x7f]/g, '')
      .slice(0, 200),
    storedName: file.filename,
    size: file.size,
    mime:
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.zip'
          ? 'application/zip'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}
const safe = (f) =>
  f ? { id: f._id, name: f.name, size: f.size, mime: f.mime, createdAt: f.createdAt } : null;
async function download(req, res, file) {
  if (!file?.storedName || !/^[a-f\d-]{36}$/i.test(file.storedName)) fail(404, 'File not found');
  const local = path.join(req.app.locals.config.uploadDir, file.storedName);
  try {
    await fs.access(local);
  } catch {
    fail(404, 'File is unavailable');
  }
  res.set('Content-Type', 'application/octet-stream');
  res.set('Cache-Control', 'no-store');
  res.download(local, file.name);
}
module.exports = { upload, remove, validate, safe, download, MAX_BYTES };
