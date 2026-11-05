const https = require('https');

exports.handler = async () => {
  const token = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!token || !siteId) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _debug: 'missing_env', has_token: !!token, has_siteId: !!siteId })
    };
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.netlify.com',
      path: `/api/v1/sites/${siteId}/submissions?per_page=100`,
      headers: { Authorization: `Bearer ${token}` }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const submissions = JSON.parse(data);
          if (!Array.isArray(submissions)) {
            resolve({
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ _debug: 'api_error', status: res.statusCode, response: submissions, siteIdLen: siteId.length, siteIdSample: siteId.substring(0, 4) + '...' + siteId.substring(siteId.length - 4), tokenLen: token.length })
            });
            return;
          }
          const reviews = submissions
            .filter(s => s.form_name === 'resenas')
            .map(s => ({
              nombre: s.data.nombre || 'Anónimo',
              modelo: s.data.modelo || '',
              estrellas: Math.min(5, Math.max(1, parseInt(s.data.estrellas) || 5)),
              comentario: s.data.comentario || '',
            }));
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(reviews)
          });
        } catch (e) {
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _debug: 'parse_error', error: e.message, raw: data.substring(0, 300) })
          });
        }
      });
    }).on('error', (err) => {
      resolve({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _debug: 'http_error', error: err.message })
      });
    });
  });
};
