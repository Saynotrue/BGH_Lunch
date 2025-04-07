const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const xml2js = require('xml2js');
const moment = require('moment');

const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const userDate = req.body.queryResult.parameters.date;
  const today = userDate ? moment(userDate).format('YYYYMMDD') : moment().format('YYYYMMDD');

  const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7531246&MLSV_YMD=${today}`;

  try {
    const response = await axios.get(url);
    const xml = response.data;
    const parser = new xml2js.Parser({ explicitArray: false, trim: true });
    const result = await parser.parseStringPromise(xml);

    const row = result?.mealServiceDietInfo?.row;
    const dishName = row?.DDISH_NM;
    const cal = row?.CAL_INFO;

    if (dishName) {
      const cleaned = dishName.replace(/\([^\)]*\)/g, '').replace(/<br\/?>/gi, '\n').trim();
      const calText = cal ? `\n\n총 칼로리: ${cal}` : '';
      return res.json({
        fulfillmentText: `🍱 오늘의 급식:\n${cleaned}${calText}`,
      });
    } else {
      return res.json({
        fulfillmentText: '오늘은 급식 정보가 없어요 😢',
      });
    }
  } catch (err) {
    console.error(err);
    return res.json({
      fulfillmentText: '급식 정보를 불러오는 중 문제가 생겼어요.',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버 실행 중: 포트 ${PORT}`);
});
