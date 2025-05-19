
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Construction } from "lucide-react";

export default function MyCurrenciesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Currencies</h1>
        <p className="text-muted-foreground">View your currency holdings.</p>
      </div>
      <Separator />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Construction className="mr-2 h-6 w-6 text-primary" />
            Coming Soon!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section to manage and view your currency investments is currently under development.
            Check back later for updates!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
