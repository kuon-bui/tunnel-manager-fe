import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Tunnel Manager</CardTitle>
          <CardDescription>Sign in with administrator credentials.</CardDescription>
        </CardHeader>
        <CardContent><LoginForm /></CardContent>
      </Card>
    </main>
  );
}
