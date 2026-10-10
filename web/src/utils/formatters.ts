import type { Advisory, DayPlan, Language } from '../api/types';

export function formatWhatsAppText(
  plan: DayPlan,
  advisory?: Advisory | null,
  lang: Language = 'en'
): string {
  const city = plan.city_label || 'Shift Location';
  const overallRisk = plan.overall_risk;
  const dateStr = plan.recorded_date || new Date(plan.generated_at).toLocaleDateString('en-IN');

  const lines: string[] = [];

  if (lang === 'hi') {
    lines.push(`*छाया (Chhaya) कार्य सुरक्षा योजना*`);
    lines.push(`स्थान: ${city} (${dateStr})`);
    lines.push(`समग्र जोखिम: *${overallRisk}*`);
    lines.push(``);

    if (advisory?.sentences && advisory.sentences.length > 0) {
      lines.push(`*सलाह (Advisory):*`);
      advisory.sentences.forEach((s) => lines.push(`• ${s.text}`));
      lines.push(``);
    }

    if (plan.recommended_blocks && plan.recommended_blocks.length > 0) {
      lines.push(`*सुरक्षित कार्य समय (Safe Blocks):*`);
      plan.recommended_blocks.forEach((b) => {
        const start = new Date(b.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const end = new Date(b.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        lines.push(`• ${start} - ${end}`);
      });
      lines.push(``);
    }

    if (plan.dangerous_windows && plan.dangerous_windows.length > 0) {
      lines.push(`*खतरे का समय (Avoid / Rest):*`);
      plan.dangerous_windows.forEach((w) => {
        const start = new Date(w.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const end = new Date(w.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        lines.push(`• ${start} - ${end} (${w.status})`);
      });
      lines.push(``);
    }

    lines.push(`*आपातकालीन सहायता (Emergency):* चक्कर या बेहोशी होने पर तुरंत छाया में जाएं और 108 पर कॉल करें।`);
  } else if (lang === 'ta') {
    lines.push(`*சாயா (Chhaya) பணி பாதுகாப்பு திட்டம்*`);
    lines.push(`இடம்: ${city} (${dateStr})`);
    lines.push(`ஒட்டுமொத்த ஆபத்து: *${overallRisk}*`);
    lines.push(``);

    if (advisory?.sentences && advisory.sentences.length > 0) {
      lines.push(`*வழிகாட்டுதல் (Advisory):*`);
      advisory.sentences.forEach((s) => lines.push(`• ${s.text}`));
      lines.push(``);
    }

    if (plan.recommended_blocks && plan.recommended_blocks.length > 0) {
      lines.push(`*பரிந்துரைக்கப்பட்ட வேலை நேரம்:*`);
      plan.recommended_blocks.forEach((b) => {
        const start = new Date(b.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const end = new Date(b.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        lines.push(`• ${start} - ${end}`);
      });
      lines.push(``);
    }

    lines.push(`*அவசர உதவி (Emergency):* மயக்கம் அல்லது அதீத சோர்வு ஏற்பட்டால் உடனே 108 அழைக்கவும்.`);
  } else {
    // English
    lines.push(`*Chhaya Shift Safety Plan*`);
    lines.push(`Location: ${city} (${dateStr})`);
    lines.push(`Overall Risk Level: *${overallRisk}*`);
    lines.push(``);

    if (advisory?.sentences && advisory.sentences.length > 0) {
      lines.push(`*Advisory Summary:*`);
      advisory.sentences.forEach((s) => lines.push(`• ${s.text}`));
      lines.push(``);
    }

    if (plan.recommended_blocks && plan.recommended_blocks.length > 0) {
      lines.push(`*Recommended Safe Work Blocks:*`);
      plan.recommended_blocks.forEach((b) => {
        const start = new Date(b.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const end = new Date(b.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        lines.push(`• ${start} – ${end}`);
      });
      lines.push(``);
    }

    if (plan.dangerous_windows && plan.dangerous_windows.length > 0) {
      lines.push(`*Dangerous Shift Windows (Avoid / Rest):*`);
      plan.dangerous_windows.forEach((w) => {
        const start = new Date(w.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const end = new Date(w.end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        lines.push(`• ${start} – ${end} (${w.status})`);
      });
      lines.push(``);
    }

    lines.push(`*Medical Alert:* In case of heat stroke symptoms, rest in shade and call 108 immediately.`);
  }

  lines.push(`\nGenerated via Chhaya (Open-Meteo / CAMS modelled data).`);
  return lines.join('\n');
}
