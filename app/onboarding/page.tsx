export default function OnboardingPage() {
  return (
    <main className="content-wrap">
      <section className="section page-hero">
        <div className="container">
          <h1>Start your Tender Hooks trial</h1>
          <p className="muted">Set your profile in under 3 minutes and receive a ranked digest each morning.</p>
        </div>
      </section>
      <section className="section">
        <div className="container form panel card">
          <form className="form-grid">
            <label>Company name*<input /></label>
            <label>Contact name*<input /></label>
            <label>Contact email*<input type="email" /></label>
            <label>Digest time*<input type="time" defaultValue="07:30" /></label>
            <label className="full">Primary services*<textarea rows={4} /></label>
            <label className="full">Keywords to prioritize*<input placeholder="cloud, managed services, cybersecurity" /></label>
            <label>Contract size<select><option>Any</option><option>Small</option><option>Medium</option><option>Large</option></select></label>
            <label>Delivery channel<select><option>Email</option><option>Telegram</option></select></label>
            <div className="full">
              <button className="btn" type="button">Submit onboarding</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
