
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Construction, Plus } from "lucide-react";
import Link from "next/link";

export default function MyCurrenciesPage() {
  return (
    <div className="space-y-8 relative min-h-[calc(100vh-10rem)]">
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
      <Link href="/investments/add" passHref>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg z-50"
          aria-label="Add new currency investment"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
