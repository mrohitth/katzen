import { getDailyTasks } from "@/lib/workspace";
import TaskBoard from "./task-board";
import CommandBar from "@/components/command-bar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TasksPage() {
  const { tasks, dateStr } = await getDailyTasks();

  return (
    <div className="p-8">
      {/* Command Bar - High Density Summary */}
      <div className="mb-6">
        <CommandBar />
      </div>

      <TaskBoard initialTasks={tasks} initialDate={dateStr} />
    </div>
  );
}