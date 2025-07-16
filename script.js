function getColorForFrequency(frequency) {
  const minFreq = 3;
  const maxFreq = 10;

  if (frequency <= minFreq) return '#FFD580'; // Açık Turuncu
  if (frequency >= maxFreq) return '#E74C3C'; // Kırmızı

  const ratio = (frequency - minFreq) / (maxFreq - minFreq);
  const r = Math.round(255 - (255 - 231) * ratio);
  const g = Math.round(213 - (213 - 76) * ratio);
  const b = Math.round(128 - (128 - 60) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

function fetchInsightsInChunks(adsets, accessToken, version, days, chunkSize = 15) {
  const today = new Date();
  const untilDate = new Date(today.getTime());
  untilDate.setDate(untilDate.getDate() - 1); // DÜN

  const sinceDate = new Date(untilDate.getTime());
  sinceDate.setDate(untilDate.getDate() - (days - 1)); // Başlangıç

  const since = Utilities.formatDate(sinceDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const until = Utilities.formatDate(untilDate, Session.getScriptTimeZone(), "yyyy-MM-dd");

  let frequencies = {};

  for (let i = 0; i < adsets.length; i += chunkSize) {
    const chunk = adsets.slice(i, i + chunkSize);
    const urls = chunk.map(adset => ({
      url: `https://graph.facebook.com/${version}/${adset.id}/insights?fields=frequency&time_range[since]=${since}&time_range[until]=${until}&access_token=${accessToken}`,
      method: "get",
      muteHttpExceptions: true
    }));

    const responses = UrlFetchApp.fetchAll(urls);

    responses.forEach((response, j) => {
      const adsetId = chunk[j].id;
      try {
        const json = JSON.parse(response.getContentText());
        const freq = json.data?.[0]?.frequency;
        frequencies[adsetId] = freq ? parseFloat(freq) : null;
      } catch (e) {
        frequencies[adsetId] = null;
      }
    });

    Utilities.sleep(1000); // Rate limit koruması
  }

  return { frequencies, sinceDate, untilDate };
}

function formatDateRange(days) {
  const today = new Date();
  const untilDate = new Date(today.getTime());
  untilDate.setDate(today.getDate() - 1);

  const sinceDate = new Date(untilDate.getTime());
  sinceDate.setDate(untilDate.getDate() - (days - 1));

  const formattedSince = Utilities.formatDate(sinceDate, Session.getScriptTimeZone(), "dd.MM.yyyy");
  const formattedUntil = Utilities.formatDate(untilDate, Session.getScriptTimeZone(), "dd.MM.yyyy");

  return `${formattedSince} – ${formattedUntil}`;
}

function checkAdSetFrequencies_MultiAccount() {
  const accessToken = '_Buraya_aldığımız_Access_Token'i_gireceğiz_';
  const version = 'v23.0';
  const threshold = 3;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const actSheet = ss.getSheetByName("actData");
  if (!actSheet) return;

  const actData = actSheet.getDataRange().getValues();
  const headers = actData.shift();
  const actNameIndex = headers.indexOf("actName");
  const actIDIndex = headers.indexOf("actID");

  let alerts = [];

  for (let i = 0; i < actData.length; i++) {
    const actName = actData[i][actNameIndex];
    let actID = actData[i][actIDIndex];
    if (!actID.startsWith('act_')) actID = 'act_' + actID;

    try {
      const adsetsUrl = `https://graph.facebook.com/${version}/${actID}/adsets?fields=id,name,campaign_id,status&access_token=${accessToken}`;
      const adsetsResp = UrlFetchApp.fetch(adsetsUrl);
      const adsetsJson = JSON.parse(adsetsResp.getContentText());
      const adsetsRaw = adsetsJson.data || [];
      if (adsetsRaw.length === 0) continue;

      const adsets = adsetsRaw.filter(adset => adset.status === 'ACTIVE');
      if (adsets.length === 0) continue;

      const campaignIds = [...new Set(adsets.map(a => a.campaign_id))];
      const campaignNamesUrl = `https://graph.facebook.com/${version}/?ids=${campaignIds.join(',')}&fields=name&access_token=${accessToken}`;
      const campaignResp = UrlFetchApp.fetch(campaignNamesUrl);
      const campaignNames = JSON.parse(campaignResp.getContentText());

      const { frequencies: freq7 } = fetchInsightsInChunks(adsets, accessToken, version, 7);
      const { frequencies: freq28 } = fetchInsightsInChunks(adsets, accessToken, version, 28);

      adsets.forEach(adset => {
        const adsetId = adset.id;
        const adsetName = adset.name;
        const campaignName = campaignNames[adset.campaign_id]?.name || "Bilinmeyen Kampanya";
        const f7 = freq7[adsetId];
        const f28 = freq28[adsetId];

        // Eğer 7 günlük frekans verisi yoksa (gösterim yok), adset rapora eklenmesin
        if (f7 === null) return;

        const show = (f7 > threshold) || (f28 !== null && f28 > threshold);

        if (show) {
          alerts.push({
            actName,
            campaignName,
            adsetName,
            freq7: f7.toFixed(2),
            freq28: f28 !== null ? f28.toFixed(2) : '-'
          });
        }
      });

    } catch (e) {
      Logger.log(`Hata (${actName} - ${actID}): ${e.message}`);
    }
  }

  if (alerts.length > 0) {
    const today = new Date();
    const formattedDate = Utilities.formatDate(today, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");

    const emailBody = `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
  <h2 style="color: #2E86C1;">Sıklığı 3'ü Geçen Reklam Setleri</h2>
  <p><strong>Oluşturulma Zamanı:</strong> ${formattedDate}</p>
  <p><strong>Veri Aralıkları:</strong><br>
  • <b>Son 7 gün:</b> ${formatDateRange(7)}<br>
  • <b>Son 28 gün:</b> ${formatDateRange(28)}</p>
  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-size: 14px;">
    <tr style="background-color: #f2f2f2;">
      <th>Hesap</th>
      <th>Kampanya</th>
      <th>Reklam Seti</th>
      <th>Sıklık (7 Gün)</th>
      <th>Sıklık (28 Gün)</th>
    </tr>
    ${alerts.map(a => {
      const c7 = parseFloat(a.freq7) > threshold ? getColorForFrequency(a.freq7) : '#000';
      const c28 = parseFloat(a.freq28) > threshold ? getColorForFrequency(a.freq28) : '#000';
      return `<tr>
        <td>${a.actName}</td>
        <td>${a.campaignName}</td>
        <td>${a.adsetName}</td>
        <td style="color: ${c7}; text-align: center;">${a.freq7}</td>
        <td style="color: ${c28}; text-align: center;">${a.freq28}</td>
      </tr>`;
    }).join('')}
  </table>
  <p style="font-size: 0.9em; color: #777;">Bu rapor <strong>Meta API</strong> ile otomatik oluşturulmuştur. </p>
</div>`;

    MailApp.sendEmail({
      to: "mail_adresinizi_buraya_girin@gmail.com",
      subject: "Sıklığı 3'ü Geçen Reklam Setleri [Meta Script][Pod ?]",
      htmlBody: emailBody,
    });
  }
}
