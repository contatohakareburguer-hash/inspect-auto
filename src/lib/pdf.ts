import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ResultadoScore } from "./scoring";
import { CHECKLIST, type ChecklistItem } from "@/data/checklist";

export type PdfInspecao = {
  id: string;
  nome_veiculo: string | null;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  km: number | null;
  cor: string | null;
  preco_pedido: number | null;
  vendedor: string | null;
  observacoes_gerais: string | null;
  created_at: string;
};

export type PdfItem = {
  id?: string;
  item_key: string;
  item_nome: string;
  categoria: string;
  status: string | null;
  observacao_usuario: string | null;
  sugestao_sistema: string | null;
};

export type PdfFoto = {
  url: string;
  item_id: string | null;
};

const STATUS_TEXT: Record<string, string> = {
  ok: "OK",
  atencao: "Atencao",
  grave: "GRAVE",
};

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function gerarPdfInspecao(args: {
  inspecao: PdfInspecao;
  itens: PdfItem[];
  fotos: PdfFoto[];
  resultado: ResultadoScore;
}): Promise<Blob> {
  const { inspecao, itens, fotos, resultado } = args;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Header
  doc.setFillColor(36, 70, 180);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setTextColor(255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Relatorio de Inspecao Veicular", margin, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
    margin,
    72
  );

  doc.setTextColor(20);
  let y = 120;

  // Dados do veículo
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Dados do Veiculo", margin, y);
  y += 8;

  autoTable(doc, {
    startY: y + 4,
    theme: "grid",
    head: [["Campo", "Valor"]],
    body: [
      ["Veiculo", inspecao.nome_veiculo || "-"],
      ["Marca/Modelo", `${inspecao.marca || "-"} ${inspecao.modelo || ""}`.trim()],
      ["Ano", inspecao.ano ? String(inspecao.ano) : "-"],
      ["Cor", inspecao.cor || "-"],
      ["Placa", inspecao.placa || "-"],
      ["Quilometragem", inspecao.km ? `${inspecao.km.toLocaleString("pt-BR")} km` : "-"],
      ["Preco pedido", inspecao.preco_pedido ? `R$ ${Number(inspecao.preco_pedido).toLocaleString("pt-BR")}` : "-"],
      ["Vendedor", inspecao.vendedor || "-"],
    ],
    headStyles: { fillColor: [36, 70, 180] },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 30;

  // Score
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resultado da Inspecao", margin, y);
  y += 14;

  const corClass: Record<string, [number, number, number]> = {
    success: [40, 160, 90],
    warning: [220, 160, 30],
    destructive: [200, 50, 50],
  };
  const corC = corClass[resultado.classificacaoColor];
  doc.setFillColor(...corC);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 70, 8, 8, "F");
  doc.setTextColor(255);
  doc.setFontSize(11);
  doc.text("Score total", margin + 16, y + 22);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text(String(resultado.scoreTotal), margin + 16, y + 56);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Classificacao", margin + 180, y + 22);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(resultado.classificacao, margin + 180, y + 50);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Recomendacao", margin + 380, y + 22);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(resultado.conclusao, margin + 380, y + 50);

  doc.setTextColor(20);
  y += 90;

  // Resumo numérico
  autoTable(doc, {
    startY: y,
    theme: "plain",
    body: [
      [
        `OK: ${resultado.totalOk}`,
        `Atencao: ${resultado.totalAtencao}`,
        `Graves: ${resultado.totalGraves}`,
        `Avaliado: ${resultado.totalAvaliado}`,
      ],
    ],
    styles: { fontSize: 11 },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Alertas
  if (resultado.alertas.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 50, 50);
    doc.text("Alertas criticos:", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    for (const a of resultado.alertas) {
      const safe = a.replace(/[^\x00-\x7F]/g, "").trim();
      const lines = doc.splitTextToSize(`- ${safe}`, pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += 14 * lines.length;
    }
    y += 6;
  }

  // Detalhamento por categoria
  for (const cat of CHECKLIST) {
    const itensCat = itens.filter((i) => i.categoria === cat.key && i.status);
    if (itensCat.length === 0) continue;

    if (y > pageHeight - 120) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(36, 70, 180);
    doc.text(cat.nome, margin, y);
    doc.setTextColor(20);
    y += 6;

    autoTable(doc, {
      startY: y + 4,
      theme: "striped",
      head: [["Item", "Status", "Observacao", "Sugestao"]],
      body: itensCat.map((i) => [
        i.item_nome,
        STATUS_TEXT[i.status || ""] || "-",
        i.observacao_usuario || "-",
        i.sugestao_sistema || "-",
      ]),
      headStyles: { fillColor: [36, 70, 180] },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 55 },
        2: { cellWidth: 160 },
        3: { cellWidth: 160 },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const v = String(data.cell.raw || "").toLowerCase();
          if (v === "grave") {
            data.cell.styles.fillColor = [255, 220, 220];
            data.cell.styles.textColor = [180, 30, 30];
            data.cell.styles.fontStyle = "bold";
          } else if (v === "atencao") {
            data.cell.styles.fillColor = [255, 240, 200];
            data.cell.styles.textColor = [160, 110, 0];
          } else if (v === "ok") {
            data.cell.styles.fillColor = [220, 245, 225];
            data.cell.styles.textColor = [30, 120, 60];
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  }

  // Observações gerais
  if (inspecao.observacoes_gerais) {
    if (y > pageHeight - 100) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Observacoes gerais", margin, y);
    y += 14;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const obs = doc.splitTextToSize(inspecao.observacoes_gerais, pageWidth - margin * 2);
    doc.text(obs, margin, y);
    y += obs.length * 14 + 16;
  }

  // Fotos
  if (fotos.length > 0) {
    doc.addPage();
    y = margin;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Evidencias fotograficas", margin, y);
    y += 24;

    const imgW = 240;
    const imgH = 180;
    const gap = 14;
    let col = 0;
    for (const f of fotos) {
      const dataUrl = await loadImageAsDataUrl(f.url);
      if (!dataUrl) continue;
      const x = margin + col * (imgW + gap);
      if (y + imgH > pageHeight - margin) {
        doc.addPage();
        y = margin;
        col = 0;
      }
      try {
        doc.addImage(dataUrl, "JPEG", x, y, imgW, imgH);
      } catch {
        // ignore
      }
      col++;
      if (col >= 2) {
        col = 0;
        y += imgH + gap;
      }
    }
  }

  // Conclusão final
  doc.addPage();
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Conclusao", margin, 80);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  const corCC = corClass[resultado.conclusaoCor];
  doc.setFillColor(...corCC);
  doc.roundedRect(margin, 110, pageWidth - margin * 2, 60, 8, 8, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(resultado.conclusao.toUpperCase(), pageWidth / 2, 150, { align: "center" });
  doc.setTextColor(20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(
    `Score: ${resultado.scoreTotal}  |  Classificacao: ${resultado.classificacao}`,
    pageWidth / 2,
    195,
    { align: "center" }
  );
  doc.text(
    "Este relatorio e uma ferramenta de apoio a decisao, baseada em inspecao visual.",
    pageWidth / 2,
    230,
    { align: "center" }
  );
  doc.text(
    "Recomenda-se laudo cautelar oficial para decisoes finais de compra.",
    pageWidth / 2,
    248,
    { align: "center" }
  );

  // Footer pages
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      `Pagina ${i} de ${pages}  |  Inspecao ID: ${inspecao.id.slice(0, 8)}`,
      pageWidth / 2,
      pageHeight - 15,
      { align: "center" }
    );
  }

  return doc.output("blob");
}
