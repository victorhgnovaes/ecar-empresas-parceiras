"""One-time content migration; layout structure remains intact."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def update(file,replacements):
    p=ROOT/file; txt=p.read_text(encoding='utf8')
    for a,b in replacements:
        if a in txt: txt=txt.replace(a,b)
    p.write_text(txt,encoding='utf8')

(ROOT/'src/components/configurator/vehicle-configurator.tsx').write_text('export { PremiumConfigurator as VehicleConfigurator } from "./premium-configurator";\n',encoding='utf8')
update('src/components/configurator/proposal-form.tsx',[
    ('Resumo da solicitação · DEMO','Resumo da solicitação'),
    ('Abrir WhatsApp oficial','Enviar ao Emerson ECAR'),
    ('Valores demonstrativos. Condições sujeitas à confirmação comercial.','Condições e disponibilidade: consulte o Emerson ECAR.'),
])
update('src/components/brand-home.tsx',[
    ('A plataforma foi pensada para empresas; a elegibilidade comercial será validada na próxima fase.','O Emerson ECAR confirma as condições e a elegibilidade para sua empresa.'),
    ('Não. Preços, anos, versões, equipamentos e descontos são demonstrativos e sem validade comercial. Os nomes dos modelos não confirmam disponibilidade ou oferta atual.','As referências vêm das fontes comerciais de outubro/2026. Consulte o Emerson ECAR para confirmar valores atualizados, condições e disponibilidade da configuração escolhida.'),
    ('O preço configurado, a base do desconto e o valor final demonstrativo são recalculados a cada escolha. As imagens são ilustrativas e não refletem a configuração.','Os valores são atualizados a cada escolha. Imagens ilustrativas; o Emerson confirma os detalhes da configuração.'),
    ('Configure o veículo e clique em Solicitar proposta. Preencha seus dados para gerar uma mensagem com o resumo e copiá-la. Nesta fase não há envio automático, reserva nem armazenamento dos dados de contato.','Configure seu veículo e clique em Solicitar proposta ou Consultar Emerson ECAR. Seu WhatsApp abre com o resumo completo, pronto para conversar com o Emerson.'),
    ('O WhatsApp oficial ainda não foi configurado no ambiente DEMO. Quando estiver disponível, o contato será exibido no cabeçalho e na proposta. A simulação não garante estoque, prazo ou condição comercial.','Fale diretamente com o Emerson ECAR pelo WhatsApp (11) 98926-6321. Ele ajuda você a escolher e confirma condições, disponibilidade e prazo.'),
    ('Simulação DEMO · condições sujeitas à confirmação','Atendimento Emerson ECAR · condições sob consulta'),
    ('Estudo ilustrativo · DEMO','Imagem ilustrativa'),
    ('Preços, versões e equipamentos demonstrativos. Imagens ilustrativas. Sem validade comercial.','Imagens ilustrativas. Valores e disponibilidade: consulte o Emerson ECAR.'),
    ('Veja preços e descontos demonstrativos e simule as condições da sua configuração.','Compare versões, pinturas e pacotes e consulte as condições da sua configuração.'),
    ('CONDIÇÕES · AMBIENTE DEMO','CONDIÇÕES PARA SUA EMPRESA'),
    ('Preços e descontos demonstrativos, sujeitos à confirmação comercial.','Consulte o Emerson ECAR sobre preços e condições atualizados.'),
    ('Resumo detalhado com base elegível explícita.','Resumo detalhado da configuração que você escolheu.'),
    ('Condições oficiais, disponibilidade e elegibilidade dependem de validação na Fase 2.','Emerson ECAR · (11) 98926-6321. Atendimento para encontrar a melhor opção para sua empresa.'),
])
update('src/app/page.tsx',[
    ('IMAGEM ILUSTRATIVA · AMBIENTE DEMO','IMAGEM ILUSTRATIVA'),
    ('<strong>Ambiente demonstrativo.</strong> Modelos, valores e condições são exemplos, sem validade comercial.','Condições e disponibilidade: consulte o Emerson ECAR · (11) 98926-6321.'),
])
update('src/components/layout/partner-footer.tsx',[
    ('Redes sociais indisponíveis no ambiente DEMO.','Atendimento: Emerson ECAR · (11) 98926-6321.'),
    ('Fase 1 — Dados e imagens demonstrativos. Sem validade comercial.','Condições e disponibilidade: consulte o Emerson ECAR.'),
    ('Plataforma em desenvolvimento.','Empresas Parceiras.'),
    ('Quando o WhatsApp oficial estiver configurado, a mensagem somente será aberta no serviço externo após sua ação. O envio dependerá de você.','Ao clicar para consultar, o WhatsApp abre com a mensagem da configuração. Você pode revisar e enviar ao Emerson ECAR.'),
    ('Valores, dados e simulações desta fase são demonstrativos e não constituem oferta comercial.','Condições e disponibilidade são confirmadas pelo Emerson ECAR. A configuração não constitui reserva ou compra.'),
    ('O documento de termos de uso ainda não está disponível no ambiente DEMO.','A ECAR Frotas oferece consulta e solicitação de proposta para empresas.'),
])
update('src/components/catalog/vehicle-catalog.tsx',[
    ('max={35000000}','max={60000000}'),
    ('Valor simulado até','Valor de referência até'),
    ('Preços e configurações demonstrativos','Consulte o Emerson ECAR'),
    ('Catálogo de demonstração. Nomes não confirmam disponibilidade atual. Imagens, versões, equipamentos, anos e preços são ilustrativos e sem validade comercial.','Imagens ilustrativas. Valores, condições e disponibilidade: consulte o Emerson ECAR · (11) 98926-6321.'),
    ('Mais filtros: câmbio e valor','Mais filtros: ano, família, combustível, câmbio e valor'),
    ('O limite usa a versão de entrada compatível com o câmbio escolhido. Os cards mostram o menor valor inicial do modelo.','O limite considera versões compatíveis com seus filtros. Consulte o Emerson ECAR para confirmar a sua condição.'),
])
update('src/app/[brand]/veiculo/[slug]/page.tsx',[
    (' Â· DEMO',''),
    ('Configure versÃ£o, cor e opcionais do ${vehicle.name}. PreÃ§os e condiÃ§Ãµes demonstrativos, sem validade comercial.','Configure versão, cor e pacotes do ${vehicle.name}. Consulte as condições com o Emerson ECAR.'),
])
