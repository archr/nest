import Route from '../../src/Route';

const route = new Route({
  provider: 'periodicoabc',
  name:     'news',
  url:      'http://www.periodicoabc.mx/functions/jsonHome-news.php?pagina=<%= state.currentPage %>',
  priority: 80,

  test: {
    query: '',
    shouldCreateItems:  true,
    shouldSpawnOperations: true
  }
});

route.scraper = function(json) {
  let data;

  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error('Invalid JSON');
  }

  const items = data.map((item) => {
    return {
      title: item.titulo,
      posted: new Date(item.fecha.replace(' de', '').replace(' del', '')),
      link: item.link,
      key: item.link.replace('http://www.periodicoabc.mx/', '')
    };
  });

  const operations = items.map((item) => {
    return {
      provider: 'periodicoabc',
      route: 'post',
      query: item.key
    };
  });

  data = {
    hasNextPage: items.length > 0,
    items: items,
    operations: operations
  };

  return data;
};

export default route;