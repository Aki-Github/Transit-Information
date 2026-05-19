import { IconButton } from '@chakra-ui/react';
import { FC, memo } from 'react';
import { Menu } from 'lucide-react';

type Props = {
  onOpen: () => void;
};

export const MenuIconButton: FC<Props> = memo((props) => {
  const { onOpen } = props;

  return (
    <IconButton 
          aria-label="メニューボタン" 
          size="sm" 
          variant="ghost"
          display={{ base: "block", md: "none" }}
          onClick={onOpen}
        >
        <Menu />
    </IconButton>
  );
});