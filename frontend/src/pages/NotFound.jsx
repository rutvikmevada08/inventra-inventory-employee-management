import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <p>The page you are looking for does not exist. <Link to="/">Go to the dashboard</Link>.</p>
    </>
  );
}
