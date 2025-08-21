const notFound = (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
};

module.exports = notFound;