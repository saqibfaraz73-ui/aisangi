import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface UserSearchProps {
  value: string;
  onChange: (value: string) => void;
}

const UserSearch = ({ value, onChange }: UserSearchProps) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      type="text"
      placeholder="Search by name or email..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-10 bg-background border-border"
    />
  </div>
);

export default UserSearch;
