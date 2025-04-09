const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const xml2js = require('xml2js');
const moment = require('moment');

const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  const intent = req.body.queryResult.intent.displayName;

  if (intent === 'Lunch') {
    const userDateParam = req.body.queryResult.parameters.date;
    const userDate = Array.isArray(userDateParam) ? userDateParam[0] : userDateParam;
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
          fulfillmentText: `🍱 급식 메뉴:\n${cleaned}${calText}`,
        });
      } else {
        return res.json({
          fulfillmentText: '급식 정보가 없어요 😢',
        });
      }
    } catch (err) {
      console.error(err);
      return res.json({
        fulfillmentText: '급식 정보를 불러오는 중 문제가 생겼어요.',
      });
    }
  }

  if (intent === 'Schedule') {
    const { date, grade, class: classNum } = req.body.queryResult.parameters;
    const parsedDate = date ? moment(date).format('YYYYMMDD') : moment().format('YYYYMMDD');

    const url = `https://open.neis.go.kr/hub/hisTimetable?ATPT_OFCDC_SC_CODE=J10&SD_SCHUL_CODE=7531246&AY=2025&SEM=1&ALL_TI_YMD=${parsedDate}&GRADE=${grade}&CLASS_NM=${classNum}`;

    try {
      const response = await axios.get(url);
      const xml = response.data;
      const parser = new xml2js.Parser({ explicitArray: false, trim: true });
      const result = await parser.parseStringPromise(xml);

      const rows = result?.hisTimetable?.row;
      if (!rows) {
        return res.json({
          fulfillmentText: '해당 날짜의 시간표 정보가 없어요 😢',
        });
      }

      const subjects = Array.isArray(rows)
        ? rows.map(r => `${r.PERIO}교시: ${r.ITRT_CNTNT}`).join('\n')
        : `${rows.PERIO}교시: ${rows.ITRT_CNTNT}`;

      return res.json({
        fulfillmentText: `📚 ${grade}학년 ${classNum}반 시간표 (${parsedDate}):\n${subjects}`,
      });
    } catch (err) {
      console.error(err);
      return res.json({
        fulfillmentText: '시간표 정보를 불러오는 중 문제가 생겼어요.',
      });
    }
  }

  // 기타 처리되지 않은 인텐트
  return res.json({
    fulfillmentText: '요청을 이해하지 못했어요.',
  });
});
