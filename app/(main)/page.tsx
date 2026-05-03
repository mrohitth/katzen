import { getDailyTasks } from "@/lib/workspace";
import TaskBoard from "./task-board";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TasksPage() {
  const { tasks, dateStr } = await getDailyTasks();

  return <TaskBoard initialTasks={tasks} initialDate={dateStr} />;
}