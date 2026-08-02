import { Resend } from "resend";

interface ContactRequestBody {
  name: string;
  email: string;
  msg: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json()) as ContactRequestBody;
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const msg = body.msg?.trim() ?? "";

  if (!name || !msg || !EMAIL_RE.test(email)) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "nicolas20032401@gmail.com",
    replyTo: email,
    subject: `Nuevo mensaje de contacto de ${name}`,
    text: `De: ${name} <${email}>\n\n${msg}`,
  });

  if (error) {
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true });
}
