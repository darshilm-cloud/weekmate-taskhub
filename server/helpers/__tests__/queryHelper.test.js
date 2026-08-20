/**
 * Query helpers: pagination maths and Mongo search-filter construction.
 * These feed straight into database queries, so an off-by-one in skip or an
 * unescaped search character has real consequences.
 */
const {
  getPagination,
  getAggregationPagination,
  getPaginationResult,
  getTotalCountQuery,
  searchDataArr,
  removeSpecialCharFromSearch,
} = require('../queryHelper');

describe('removeSpecialCharFromSearch', () => {
  it('returns an empty string for falsy input', () => {
    expect(removeSpecialCharFromSearch('')).toBe('');
    expect(removeSpecialCharFromSearch(undefined)).toBe('');
    expect(removeSpecialCharFromSearch(null)).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(removeSpecialCharFromSearch('  hello  ')).toBe('hello');
  });

  it('leaves ordinary text untouched', () => {
    expect(removeSpecialCharFromSearch('invoice export 2026')).toBe('invoice export 2026');
  });

  it.each([
    ['!', '\\!'], ['@', '\\@'], ['#', '\\#'], ['$', '\\$'], ['%', '\\%'],
    ['^', '\\^'], ['&', '\\&'], ['*', '\\*'], ['(', '\\('], [')', '\\)'],
    ['[', '\\['], [']', '\\]'], [';', '\\;'], ['{', '\\{'], ['}', '\\}'],
    [',', '\\,'],
  ])('escapes %s so it cannot alter the generated regex', (char, escaped) => {
    expect(removeSpecialCharFromSearch(`a${char}b`)).toBe(`a${escaped}b`);
  });

  it('escapes every occurrence, not just the first', () => {
    expect(removeSpecialCharFromSearch('a*b*c')).toBe('a\\*b\\*c');
  });
});

describe('getPagination', () => {
  it('computes skip from page and limit', () => {
    expect(getPagination({ pageNum: 3, pageLimit: 25, sort: 'createdAt', sortBy: 'asc' }))
      .toEqual({ page: 3, limit: 25, skip: 50, sort: { createdAt: 1 } });
  });

  it('skips nothing on the first page', () => {
    expect(getPagination({ pageNum: 1, pageLimit: 10, sort: 'title', sortBy: 'asc' }).skip).toBe(0);
  });

  it('sorts descending for anything that is not "asc"', () => {
    expect(getPagination({ pageNum: 1, pageLimit: 10, sort: 'title', sortBy: 'desc' }).sort)
      .toEqual({ title: -1 });
    expect(getPagination({ pageNum: 1, pageLimit: 10, sort: 'title', sortBy: undefined }).sort)
      .toEqual({ title: -1 });
  });
});

describe('getAggregationPagination', () => {
  it('appends sort, skip and limit stages in that order', () => {
    const main = [{ $match: { active: true } }];
    const out = getAggregationPagination(main, { sort: { a: 1 }, skip: 10, limit: 5 });
    expect(out).toEqual([
      { $match: { active: true } },
      { $sort: { a: 1 } },
      { $skip: 10 },
      { $limit: 5 },
    ]);
  });

  it('does not mutate the query it was given', () => {
    const main = [{ $match: {} }];
    getAggregationPagination(main, { sort: {}, skip: 0, limit: 1 });
    expect(main).toHaveLength(1);
  });
});

describe('getPaginationResult', () => {
  it('builds a $facet returning both metadata and the page of data', () => {
    const [stage] = getPaginationResult(2, 20);
    expect(stage.$facet.data).toEqual([{ $skip: 20 }, { $limit: 20 }]);
    expect(stage.$facet.metadata[0]).toEqual({ $count: 'total' });
    expect(stage.$facet.metadata[1].$addFields).toEqual({ pageNo: 2, limit: 20 });
  });

  it('skips nothing on page 1', () => {
    expect(getPaginationResult(1, 15)[0].$facet.data[0]).toEqual({ $skip: 0 });
  });
});

describe('getTotalCountQuery', () => {
  it('appends a counting $group to the pipeline', () => {
    expect(getTotalCountQuery([{ $match: { x: 1 } }])).toEqual([
      { $match: { x: 1 } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]);
  });
});

describe('searchDataArr', () => {
  it('builds a case-insensitive $or across every searchable field', () => {
    expect(searchDataArr(['title', 'descriptions'], 'report')).toEqual({
      $or: [
        { title: { $regex: 'report', $options: 'i' } },
        { descriptions: { $regex: 'report', $options: 'i' } },
      ],
    });
  });

  it('escapes the search term so regex metacharacters cannot leak in', () => {
    expect(searchDataArr(['title'], 'a(b)')).toEqual({
      $or: [{ title: { $regex: 'a\\(b\\)', $options: 'i' } }],
    });
  });

  it('returns an empty filter when there are no fields to search', () => {
    expect(searchDataArr([], 'anything')).toEqual({});
  });
});
