const jwt = require("jsonwebtoken");
const { errorResponse } = require("./response");

class FilesGenerate {
  generatePDF = async (templateName, data) => {
    return new Promise(async (resolve, reject) => {
      try {
        let { headers, details } = data;

        let templatePath = path.join(__dirname, `../templates/${templateName}`);

        readHTMLFile(templatePath, async (err, html) => {
          if (err) {
            return reject(err);
          }
          let htmlData = Handlebars.compile(html)({
            headers: headers,
            data: details,
          });
          let pdfData = await getPdf(htmlData);
          return resolve(pdfData);
        });
      } catch (error) {
        return reject(error);
      }
    });
  };

  generateCSV = async (data, csvFields = null) => {
    return new Promise(async (resolve, reject) => {
      try {
        let json2csvParser;
        if (csvFields) {
          json2csvParser = new Parser({ csvFields });
        } else {
          json2csvParser = new Parser();
        }
        const csvData = json2csvParser.parse(data);
        let result = Buffer.from(csvData).toString("base64");
        resolve(result);
      } catch (error) {
        return reject(error);
      }
    });
  };

  generateXLSX = async (data) => {
    return new Promise(async (resolve, reject) => {
      try {
        // json2xls returns xlsx file data in binary format
        const xlsxBinaryData = json2xls(data);
        // https://stackabuse.com/encoding-and-decoding-base64-strings-in-node-js/#encodingbinarydatatobase64strings
        // read Reza Rahmati's comment
        const xlsxDataBuffer = Buffer.from(xlsxBinaryData, "binary");
        let result = xlsxDataBuffer.toString("base64");
        resolve(result);
      } catch (error) {
        return reject(error);
      }
    });
  };
}

module.exports = new FilesGenerate();
