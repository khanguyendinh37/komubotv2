import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { Message, EmbedBuilder, Client } from "discord.js";
import { OdinReportService } from "src/bot/utils/odinReport/odinReport.service";
import { ReportCheckCameraService } from "src/bot/utils/reportCheckCamera/reportCheckCamera.service";
import { ReportCheckoutService } from "src/bot/utils/reportCheckout/reportCheckout.service";
import { ReportDailyService } from "src/bot/utils/reportDaily/report-daily.service";
import { ReportHolidayService } from "src/bot/utils/reportHoliday/reportHoliday.service";
import { ReportMentionService } from "src/bot/utils/reportMention/reportMention.service";
import { ReportMsgCountService } from "src/bot/utils/reportMsgCount/reportMsgCount.service";
import { ReportOpenTalkService } from "src/bot/utils/reportOpentalk/reportOpentalk.service";
import { ReportOrderService } from "src/bot/utils/reportOrder/reportOrder.service";
import { ReportScoreService } from "src/bot/utils/reportScore/report-score.service";
import { ReportTrackerService } from "src/bot/utils/reportTracker/reportTracker.service";
import { ReportWFHService } from "src/bot/utils/reportWFH/report-wfh.service";
import { ReportWomenDayService } from "src/bot/utils/reportWomenDay/reportWomenDay.service";
import { CommandLine, CommandLineClass } from "../../base/command.base";

const messHelpDaily =
  "```" +
  "*report daily" +
  "\n" +
  "*report weekly" +
  "\n" +
  "*report daily dd/MM/YYYY" +
  "```";

@CommandLine({
  name: "report",
  description: "report",
  cat: "komu",
})
export class ReportCommand implements CommandLineClass {
  constructor(
    private reportOrderService: ReportOrderService,
    private reportHolidayService: ReportHolidayService,
    private reportOpentalkService: ReportOpenTalkService,
    private reportWFHService: ReportWFHService,
    private reportDailyService: ReportDailyService,
    private ReportMentionService: ReportMentionService,
    private reportWomenDayService: ReportWomenDayService,
    private reportCheckoutService: ReportCheckoutService,
    private reportScoreService: ReportScoreService,
    private reportCheckCameraService: ReportCheckCameraService,
    private odinReportService: OdinReportService,
    private reportTrackerService: ReportTrackerService,
    private reportMsgCountService: ReportMsgCountService,
  ) {}

  getTimeWeekMondayToFriday(dayNow) {
    const curr = new Date();
    // current date of week
    const currentWeekDay = curr.getDay();
    const lessDays = currentWeekDay == 0 ? 6 : currentWeekDay - 1;
    const firstweek = new Date(
      new Date(curr).setDate(curr.getDate() - lessDays)
    );
    let arrayDay;
    if (dayNow === 0 || dayNow === 6 || dayNow === 5) {
      arrayDay = [2, 3, 4, 5, 6];
    } else {
      arrayDay = Array.from({ length: dayNow }, (v, i) => i + 2);
    }
    function getDayofWeek(rank) {
      // rank 2 -> 6 (Monday -> Friday)
      return new Date(
        new Date(firstweek).setDate(firstweek.getDate() + rank - 2)
      );
    }
    return arrayDay.map((item) => getDayofWeek(item));
  }

  async execute(message: Message, args, client: Client, guildDB) {
    try {
      if (args[0] === "daily") {
        if (args[1]) {
          const day = args[1].slice(0, 2);
          const month = args[1].slice(3, 5);
          const year = args[1].slice(6);
          const fomat = `${month}/${day}/${year}`;
          const dateTime = new Date(fomat);
          if (
            !/^(((0[1-9]|[12]\d|3[01])\/(0[13578]|1[02])\/((19|[2-9]\d)\d{2}))|((0[1-9]|[12]\d|30)\/(0[13456789]|1[012])\/((19|[2-9]\d)\d{2}))|((0[1-9]|1\d|2[0-8])\/02\/((19|[2-9]\d)\d{2}))|(29\/02\/((1[6-9]|[2-9]\d)(0[48]|[2468][048]|[13579][26])|(([1][26]|[2468][048]|[3579][26])00))))$/.test(
              args[1]
            )
          ) {
            return message.channel.send(messHelpDaily);
          }
          await this.reportDailyService.reportDaily(
            dateTime,
            message,
            args,
            client,
            guildDB
          );
        } else {
          await this.reportDailyService.reportDaily(
            null,
            message,
            args,
            client,
            guildDB
          );
        }
      } else if (args[0] === "weekly") {
        for (const day of this.getTimeWeekMondayToFriday(new Date().getDay())) {
          await this.reportDailyService.reportDaily(
            day,
            message,
            args,
            client,
            guildDB
          );
        }
      } else if (args[0] === "mention") {
        await this.ReportMentionService.reportMention(message, args, client);
      } else if (args[0] === "checkcamera") {
        await this.reportCheckCameraService.reportCheckCamera(
          message,
          args,
          client
        );
      } else if (args[0] === "wfh" && args[1] === "complain") {
        await this.reportWFHService.reportCompalinWfh(message, args, client);
      } else if (args[0] === "wfh") {
        await this.reportWFHService.reportWfh(message, args, client);
      } else if (args[0] === "msgcount") {
        await this.reportMsgCountService.reportMessageCount(message);
      } else if (args[0] === "quiz") {
        await this.reportScoreService.reportScore(message);
      } else if (args[0] === "womenday") {
        await this.reportWomenDayService.reportWomenDay(message);
      } else if (args[0] === "order") {
        await this.reportOrderService.reportOrder(message);
      } else if (args[0] === "opentalk") {
        await this.reportOpentalkService.reportOpentalk(message);
      } else if (args[0] === "komuweekly") {
        await this.odinReportService.handleKomuWeeklyReport(message, args);
      } else if (args[0] === "tracker") {
        await this.reportTrackerService.reportTracker(message, args, client);
      } else if (args[0] === "trackernot") {
        if (args[1]) {
          const day = args[1].slice(0, 2);
          const month = args[1].slice(3, 5);
          const year = args[1].slice(6);
          const format = `${month}/${day}/${year}`;
          const dateTime = new Date(format);
          if (
            !/^(((0[1-9]|[12]\d|3[01])\/(0[13578]|1[02])\/((19|[2-9]\d)\d{2}))|((0[1-9]|[12]\d|30)\/(0[13456789]|1[012])\/((19|[2-9]\d)\d{2}))|((0[1-9]|1\d|2[0-8])\/02\/((19|[2-9]\d)\d{2}))|(29\/02\/((1[6-9]|[2-9]\d)(0[48]|[2468][048]|[13579][26])|(([1][26]|[2468][048]|[3579][26])00))))$/.test(
              args[1]
            )
          ) {
            return message.channel.send("```" +
            "*report trackernot dd/MM/YYYY" +
            "```");
          }
        await this.reportTrackerService.reportTrackerNot(dateTime, message, args, client);
        } else {
          return message.channel.send("```" +
            "*report trackernot dd/MM/YYYY" +
            "```");
        }
      } else if (args[0] === "holiday") {
        await this.reportHolidayService.reportHoliday(message, args, client);
      } else if (args[0] === "ts") {
        await this.reportCheckoutService.reportCheckout(message, args, client);
      } else if (args[0] === "help") {
        return message
          .reply(
            "```" +
              "*report options" +
              "\n" +
              "options  " +
              "\n" +
              [
                { name: "daily", des: "show daily today" },
                { name: "weekly", des: "show daily weekly" },
                { name: "mention", des: "show check mention day" },
                { name: "checkcamera", des: "show checkcamera day" },
                {
                  name: "wfh ",
                  des: "show user don't reply to bot ",
                },
                {
                  name: "wfh complain",
                  des: "show user don't reply to bot & pm confirm",
                },
                {
                  name: "msgcount",
                  des: "show top 20 count message",
                },
                {
                  name: "quiz",
                  des: "show top 10 quiz",
                },
                {
                  name: "komuweekly",
                  des: "show Komu weekly report",
                },
                {
                  name: "tracker",
                  des: "show report tracker today",
                },
                {
                  name: "holiday",
                  des: "show report holiday",
                },
                {
                  name: "ts",
                  des: "show report timesheet",
                },
              ]
                .map((item) => `- ${item.name} : ${item.des}`)
                .join("\n") +
              "```"
          )
          .catch(console.error);
      } else {
        return message
          .reply("```" + "*report help" + "```")
          .catch(console.error);
      }
    } catch (err) {
      console.log(err);
    }
  }
}
