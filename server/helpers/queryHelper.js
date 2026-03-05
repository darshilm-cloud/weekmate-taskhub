const { statusCode } = require("./constant");
const resMsg = require("./messages");

class QueryHelper {
  getPagination = (queryParams) => {
    return {
      page: queryParams.pageNum,
      limit: queryParams.pageLimit,
      skip: queryParams.pageLimit * (queryParams.pageNum - 1),
      sort: { [queryParams.sort]: queryParams.sortBy == "asc" ? 1 : -1 },
    };
  };
  getAggregationPagination = (mainQuery, paginationObj) => {
    return [
      ...mainQuery,
      ...[
        { $sort: paginationObj.sort },
        { $skip: paginationObj.skip },
        { $limit: paginationObj.limit },
      ],
    ];
  };
  getTotalCountQuery = (mainQuery) => {
    return [
      ...mainQuery,
      ...[
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        },
      ],
    ];
  };
  searchDataArr = (searchProps, searchKey) => {
    const orFilter = [];
    searchProps.forEach((s) => {
      orFilter.push({
        [s]: {
          $regex: this.removeSpecialCharFromSearch(searchKey),
          $options: "i",
        },
      });
    });

    return orFilter.length > 0 ? { ["$or"]: orFilter } : {};
  };
  removeSpecialCharFromSearch = (search) => {
    return search
      .trim()
      .replace(/\!/g, "\\!")
      .replace(/\@/g, "\\@")
      .replace(/\#/g, "\\#")
      .replace(/\$/g, "\\$")
      .replace(/\%/g, "\\%")
      .replace(/\^/g, "\\^")
      .replace(/\&/g, "\\&")
      .replace(/\*/g, "\\*")
      .replace(/\)/g, "\\)")
      .replace(/\(/g, "\\(")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .replace(/\;/g, "\\;")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/\,/g, "\\,");
  };
}

module.exports = new QueryHelper();
