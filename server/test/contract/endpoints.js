module.exports = [
  { name: 'palaces', method: 'get', path: '/api/palaces' },
  { name: 'palace-detail', method: 'get', path: '/api/palaces/taihedian' },
  { name: 'palaces-filter', method: 'get', path: '/api/palaces/filter' },
  { name: 'timeline', method: 'get', path: '/api/timeline' },
  { name: 'encyclopedia', method: 'get', path: '/api/encyclopedia' },
  { name: 'quiz-categories', method: 'get', path: '/api/quiz/categories' },
  { name: 'quiz-questions', method: 'get', path: '/api/quiz/questions/1' },
  {
    name: 'quiz-answer-guest',
    method: 'post',
    path: '/api/quiz/answer',
    body: { question_id: 1, answer: 'X' },
  },
  { name: 'search', method: 'get', path: '/api/search?q=%E6%96%97%E6%8B%B1' },
  { name: 'search-suggest', method: 'get', path: '/api/search/suggest?q=%E6%96%97' },
  { name: 'assets-manifest', method: 'get', path: '/api/assets/manifest' },
  {
    name: 'share-palace',
    method: 'get',
    path: '/share/palace/taihedian',
    kind: 'share',
  },
];