import type { StaticImageData } from "next/image";
import drCalendar from "../../public/work/app/dr-calendar.webp";
import drJob from "../../public/work/app/dr-job.webp";
import drJobs from "../../public/work/app/dr-jobs.webp";
import opBookings from "../../public/work/app/op-bookings.webp";
import opJob from "../../public/work/app/op-job.webp";
import opToday from "../../public/work/app/op-today.webp";

type Screen = { src: StaticImageData; title: string; alt: string };

/** Real screens from EV Exec's live system; customer and driver details are replaced with examples. */
export const APPS: Record<"operator" | "driver", { label: string; screens: Screen[] }> = {
  operator: {
    label: "Operator app",
    screens: [
      {
        src: opToday,
        title: "Today",
        alt: "Operator app, Today: jobs today, messages to reply to, bookings needing a driver, and drivers on shift",
      },
      {
        src: opBookings,
        title: "Bookings",
        alt: "Operator app, Bookings: upcoming transfers by day, each with pickup, drop-off, price, driver and status",
      },
      {
        src: opJob,
        title: "Job detail",
        alt: "Operator app, a booking: call and WhatsApp buttons, route, and actions to edit or create a return journey",
      },
    ],
  },
  driver: {
    label: "Driver app",
    screens: [
      {
        src: drJobs,
        title: "Jobs",
        alt: "Driver app, Jobs: upcoming transfers with times, routes, references and payment status",
      },
      {
        src: drJob,
        title: "On the job",
        alt: "Driver app, a job: passenger contact, route with directions, and the verified flight's arrival time",
      },
      {
        src: drCalendar,
        title: "Calendar",
        alt: "Driver app, Calendar: jobs and earnings for the month, with the day's jobs below",
      },
    ],
  },
};
