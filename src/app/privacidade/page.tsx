import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — math.log",
  description: "Política de privacidade e informação sobre cookies do math.log",
};

export default function PrivacidadePage() {
  return (
    <div className="legal-page">
      <h1 className="legal-title">Política de Privacidade</h1>
      <p className="legal-updated">Última atualização: março de 2026</p>

      <section className="legal-section">
        <h2>1. Responsável pelo Tratamento</h2>
        <p>
          O presente site <strong>math.log</strong> é um projeto educativo sem
          fins lucrativos, dedicado à disponibilização de conteúdos de
          Matemática A para o ensino secundário português.
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Dados Recolhidos</h2>
        <p>
          Caso o utilizador aceite os cookies analíticos, recolhemos os
          seguintes dados de forma anónima:
        </p>
        <ul>
          <li>Páginas visitadas, respetivo percurso de navegação e tempo de permanência em cada página</li>
          <li>Tipo de navegador (browser) e sistema operativo</li>
          <li>Tipo de dispositivo (computador, tablet ou telemóvel)</li>
          <li>País e cidade de acesso (obtidos a partir do endereço IP, sem armazenar o IP)</li>
          <li>Página de referência (referrer)</li>
        </ul>
        <p>
          <strong>Não recolhemos</strong> nomes, e-mails, endereços IP, nem
          quaisquer dados que permitam identificar pessoalmente o utilizador.
        </p>
      </section>

      <section className="legal-section">
        <h2>3. Finalidade</h2>
        <p>
          Os dados analíticos são utilizados exclusivamente para compreender como
          o site é utilizado e melhorar os conteúdos e a experiência de
          navegação.
        </p>
      </section>

      <section className="legal-section">
        <h2>4. Base Legal</h2>
        <p>
          O tratamento de dados analíticos é realizado com base no
          <strong> consentimento do utilizador</strong> (artigo 6.º, n.º 1,
          alínea a) do RGPD). O utilizador pode aceitar ou rejeitar os cookies
          analíticos através do banner apresentado na primeira visita.
        </p>
      </section>

      <section className="legal-section">
        <h2>5. Cookies</h2>
        <p>Este site utiliza os seguintes tipos de cookies:</p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Finalidade</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>cookie-consent</td>
                <td>Funcional</td>
                <td>Armazena a preferência de consentimento do utilizador</td>
                <td>Permanente (localStorage)</td>
              </tr>
              <tr>
                <td>analytics-session</td>
                <td>Analítico</td>
                <td>Identifica a sessão de navegação (sem dados pessoais)</td>
                <td>Sessão (sessionStorage)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="legal-section">
        <h2>6. Partilha de Dados</h2>
        <p>
          Os dados recolhidos não são partilhados com terceiros, não são vendidos
          e não são utilizados para fins publicitários.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. Direitos do Utilizador</h2>
        <p>
          Nos termos do Regulamento Geral sobre a Proteção de Dados (RGPD), o
          utilizador tem direito a:
        </p>
        <ul>
          <li>Retirar o consentimento a qualquer momento, limpando os cookies do navegador</li>
          <li>Solicitar informação sobre os dados tratados</li>
          <li>Solicitar a eliminação dos dados</li>
          <li>Apresentar reclamação junto da CNPD (Comissão Nacional de Proteção de Dados)</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>8. Segurança</h2>
        <p>
          Os dados analíticos são armazenados em servidores seguros e o acesso é
          restrito a administradores autenticados.
        </p>
      </section>

      <section className="legal-section">
        <h2>9. Alterações</h2>
        <p>
          Esta política pode ser atualizada periodicamente. A data de última
          atualização encontra-se no topo desta página.
        </p>
      </section>
    </div>
  );
}
