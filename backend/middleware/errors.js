export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A record with those details already exists.' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'This record is linked to other data and cannot be changed that way.' });
  }
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong on the server.' });
}
