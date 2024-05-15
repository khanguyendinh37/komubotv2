import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import https from "https";

function getStatusDay() {
  let statusDay;
  let date = new Date();
  const timezone = date.getTimezoneOffset() / -60;
  const hour = date.getHours();
  if (hour < 5 + timezone) {
    statusDay = "Morning";
  } else if (hour < 11 + timezone) {
    statusDay = "Afternoon";
  }
  return statusDay;
}

export async function getUserOffWork(date?) {
  try {
    let userOffFullday = [];
    let userOffMorning = [];
    let userOffAfternoon = [];

    const url = date
      ? `https://timesheetapi.nccsoft.vn/api/services/app/Public/GetAllUserLeaveDay?date=${date.toDateString()}`
      : "https://timesheetapi.nccsoft.vn/api/services/app/Public/GetAllUserLeaveDay";
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const response = await firstValueFrom(
      new HttpService().get(url, { httpsAgent }).pipe((res) => res)
    );

    if ((response as any).data && (response as any).data.result) {
      userOffFullday = (response as any).data.result
        .filter((user) => user.message.includes("Off Fullday"))
        .map((item) => item.emailAddress.replace("@ncc.asia", ""));
      userOffMorning = (response as any).data.result
        .filter((user) => user.message.includes("Off Morning"))
        .map((item) => item.emailAddress.replace("@ncc.asia", ""));
      userOffAfternoon = (response as any).data.result
        .filter((user) => user.message.includes("Off Afternoon"))
        .map((item) => item.emailAddress.replace("@ncc.asia", ""));
    }

    let notSendUser =
      getStatusDay() === "Morning"
        ? [...userOffFullday, ...userOffMorning]
        : [...userOffFullday, ...userOffAfternoon];

    return { notSendUser, userOffFullday, userOffMorning, userOffAfternoon };
  } catch (error) {
    console.log(error);
  }
}
