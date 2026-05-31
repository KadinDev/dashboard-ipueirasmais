import styled from 'styled-components';

export const Page = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;

  @media (max-width: 880px) {
    grid-template-columns: 1fr;
  }
`;

export const Sidebar = styled.aside`
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: #120b22;
  padding: 22px;
  position: sticky;
  top: 0;
  height: 100vh;

  @media (max-width: 880px) {
    position: static;
    height: auto;
  }
`;

export const Main = styled.main`
  padding: 24px;
  max-width: 1320px;
  width: 100%;
`;

export const Brand = styled.div`
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 6px;
`;

export const Muted = styled.p`
  margin: 0;
  color: #a89abc;
  font-size: 13px;
`;

export const Nav = styled.nav`
  display: grid;
  gap: 8px;
  margin-top: 24px;
`;

export const NavButton = styled.button<{ $active?: boolean }>`
  border: 1px solid ${({ $active }) => ($active ? '#ff7a00' : 'rgba(255,255,255,0.08)')};
  background: ${({ $active }) => ($active ? 'rgba(255,122,0,0.16)' : 'rgba(255,255,255,0.04)')};
  color: #fff;
  border-radius: 8px;
  padding: 11px 12px;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const Header = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 20px;
`;

export const Title = styled.h1`
  margin: 0 0 6px;
  font-size: 28px;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const Card = styled.section`
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #171027;
  border-radius: 8px;
  padding: 16px;
`;

export const CardTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 16px;
`;

export const StatValue = styled.div`
  font-size: 28px;
  font-weight: 800;
  margin-top: 8px;
`;

export const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
`;

export const Button = styled.button<{ $variant?: 'primary' | 'danger' | 'ghost' }>`
  border: 1px solid
    ${({ $variant }) =>
      $variant === 'danger' ? '#ef4444' : $variant === 'ghost' ? 'rgba(255,255,255,0.12)' : '#ff7a00'};
  background: ${({ $variant }) =>
    $variant === 'danger' ? '#7f1d1d' : $variant === 'ghost' ? 'transparent' : '#ff7a00'};
  color: #fff;
  border-radius: 8px;
  padding: 10px 13px;
  font-weight: 700;
`;

export const Field = styled.label`
  display: grid;
  gap: 7px;
  color: #d9d0e7;
  font-size: 13px;
`;

export const Input = styled.input`
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #211733;
  color: #fff;
  border-radius: 8px;
  padding: 11px 12px;
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 96px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #211733;
  color: #fff;
  border-radius: 8px;
  padding: 11px 12px;
  resize: vertical;
`;

export const Select = styled.select`
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #211733;
  color: #fff;
  border-radius: 8px;
  padding: 11px 12px;
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;

  th,
  td {
    padding: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    text-align: left;
    vertical-align: middle;
  }

  th {
    color: #b9abc9;
    font-size: 12px;
    font-weight: 700;
  }
`;

export const Badge = styled.span<{ $tone?: 'green' | 'orange' | 'red' | 'blue' }>`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 12px;
  color: #fff;
  background: ${({ $tone }) =>
    $tone === 'green'
      ? '#166534'
      : $tone === 'red'
        ? '#7f1d1d'
        : $tone === 'blue'
          ? '#1d4ed8'
          : '#9a3412'};
`;

export const Empty = styled.div`
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  padding: 24px;
  color: #a89abc;
  text-align: center;
`;

export const ErrorBox = styled.div`
  border: 1px solid #ef4444;
  background: rgba(127, 29, 29, 0.35);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 14px;
`;
