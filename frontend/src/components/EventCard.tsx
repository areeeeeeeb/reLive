import { Card, CardContent } from "@/components/ui/card";

interface EventCardProps {
  title: string;
  date: string;
  location: string;
  imageUrl: string;
  imageAlt?: string;
}

export default function EventCard({
  title,
  date,
  location,
}: EventCardProps) {
  return (
    <div className="bg-black text-white max-w-3xl py-0 border-0">
      <div className="flex items-center gap-4 px-0">
        {/* event image */}
        <div className="size-16 overflow-hidden bg-zinc-800 rounded-sm">
        </div>

        {/* event details */}
        <div className="flex flex-col flex-1 h-fit">
          <p className="text-base font-semibold leading-none">{title}</p>
          <p className="text-sm text-zinc-400">{date}</p>
          <p className="text-sm text-zinc-400">{location}</p>
        </div>
      </div>
    </div>
  );
}
